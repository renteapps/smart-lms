"use server";

import { fetchPandaVideoSubtitleText } from "@/lib/pandavideo-server";
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

export async function getPandaVideoTranscription(videoId: string): Promise<{
  success: boolean;
  text?: string | null;
  error?: string;
}> {
  try {
    await requireAdmin();
    const cleanId = videoId?.trim();
    if (!cleanId) {
      return { success: false, text: null, error: "Identificador do vídeo não informado." };
    }

    const result = await fetchPandaVideoSubtitleText(cleanId);
    if (!result.success || !result.vttContent) {
      return {
        success: false,
        text: null,
        error: result.error || "Nenhuma legenda encontrada para este vídeo no PandaVideo.",
      };
    }

    const plainText = parseVttToText(result.vttContent);
    if (!plainText || !plainText.trim()) {
      return {
        success: false,
        text: null,
        error: "O arquivo de legenda do vídeo está vazio.",
      };
    }

    return { success: true, text: plainText };
  } catch (error: any) {
    console.error("Error fetching panda video transcription:", error);
    return {
      success: false,
      text: null,
      error: error?.message || "Não foi possível consultar as legendas no PandaVideo.",
    };
  }
}
