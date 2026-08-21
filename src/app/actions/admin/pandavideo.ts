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

    // Use the known PandaVideo subtitles API endpoint
    const response = (await fetchPandaVideo(`/videos/${cleanId}/subtitles`)) as any;

    const subtitles = Array.isArray(response)
      ? response
      : response?.subtitles || (response?.videos ? response.videos : []);

    if (!Array.isArray(subtitles) || subtitles.length === 0) {
      return {
        success: false,
        text: null,
        error: "Nenhuma legenda encontrada para este vídeo no PandaVideo.",
      };
    }

    let subtitle = subtitles.find(
      (s: any) =>
        s?.language === "pt-BR" ||
        s?.language === "pt" ||
        s?.lang === "pt-BR" ||
        s?.lang === "pt" ||
        s?.srclang === "pt" ||
        s?.srclang === "pt-BR"
    );
    if (!subtitle) {
      subtitle = subtitles[0];
    }

    const vttUrl = subtitle?.vtt || subtitle?.url || subtitle?.src;
    if (!vttUrl) {
      return {
        success: false,
        text: null,
        error: "Arquivo de legenda não localizado no PandaVideo.",
      };
    }

    const vttRes = await fetch(vttUrl);
    if (!vttRes.ok) {
      return {
        success: false,
        text: null,
        error: "Não foi possível transferir o arquivo de legenda do PandaVideo.",
      };
    }

    const vttContent = await vttRes.text();
    const plainText = parseVttToText(vttContent);

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
