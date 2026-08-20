import { normalizePandaVideo } from "@/lib/pandavideo";
import { fetchPandaVideo, PandaVideoApiError, pandaVideoErrorResponse } from "@/lib/pandavideo-server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ videoId: string }> },
) {
  try {
    const { videoId } = await context.params;
    if (!/^[0-9a-f-]{36}$/i.test(videoId)) {
      throw new PandaVideoApiError("Identificador de vídeo inválido.", 400, "INVALID_VIDEO_ID");
    }

    const rawData = await fetchPandaVideo(`/videos/${encodeURIComponent(videoId)}`);
    const video = normalizePandaVideo(rawData);
    if (!video) {
      throw new PandaVideoApiError("O PandaVideo retornou dados inválidos para este vídeo.", 502, "INVALID_VIDEO_DATA");
    }

    return Response.json({ video });
  } catch (error) {
    return pandaVideoErrorResponse(error);
  }
}
