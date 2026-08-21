"use server";

import { fetchPandaVideo } from "@/lib/pandavideo-server";
import { requireAdmin } from "@/lib/supabase/auth";

function parseVttToText(vtt: string): string {
  let text = vtt.replace(/^WEBVTT[^\r\n]*/, "");
  text = text.replace(/<[^>]+>/g, ""); 
  
  const lines = text.split('\n').map(l => l.trim());
  const formattedLines: string[] = [];
  
  let currentTimestamp = "";
  let currentText = "";
  
  for (const line of lines) {
    if (!line) continue;
    if (/^\d+$/.test(line)) continue;
    
    // Match timestamps like 00:00:00.000 or 00:00.000
    const timestampMatch = line.match(/^(\d{2}:\d{2}:\d{2}|\d{2}:\d{2})\.\d+\s*-->/);
    if (timestampMatch) {
      if (currentText && currentTimestamp) {
        formattedLines.push(`${currentTimestamp} ${currentText.trim()}`);
      }
      currentTimestamp = `[${timestampMatch[1]}]`;
      currentText = "";
      continue;
    }
    
    currentText += (currentText ? " " : "") + line;
  }
  
  if (currentText && currentTimestamp) {
    formattedLines.push(`${currentTimestamp} ${currentText.trim()}`);
  }
  
  // Remove exact duplicated consecutive lines
  const uniqueLines = formattedLines.filter((line, index, arr) => {
    return index === 0 || line !== arr[index - 1];
  });

  return uniqueLines.join("\n");
}

export async function getPandaVideoTranscription(videoId: string) {
  try {
    await requireAdmin();
    // Use the known PandaVideo subtitles API endpoint
    const response = await fetchPandaVideo(`/videos/${videoId}/subtitles`) as any;
    
    const subtitles = Array.isArray(response) ? response : response?.subtitles || [];
    
    if (subtitles.length === 0) {
      return { text: null };
    }
    
    let subtitle = subtitles.find((s: any) => s.language === "pt-BR" || s.language === "pt");
    if (!subtitle) {
      subtitle = subtitles[0];
    }
    
    // Typical Panda Video subtitles format contains `vtt` or `url`
    const vttUrl = subtitle?.vtt || subtitle?.url;
    if (!vttUrl) {
      return { text: null };
    }
    
    const vttRes = await fetch(vttUrl);
    if (!vttRes.ok) return { text: null };
    
    const vttContent = await vttRes.text();
    const plainText = parseVttToText(vttContent);
    
    return { text: plainText };
  } catch (error) {
    console.error("Error fetching panda video transcription:", error);
    return { text: null };
  }
}
