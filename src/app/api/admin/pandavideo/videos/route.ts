import {
  buildPandaVideoListSearchParams,
  normalizePandaVideos,
  parsePandaVideoListRequest,
} from "@/lib/pandavideo";
import { fetchPandaVideo, pandaVideoErrorResponse } from "@/lib/pandavideo-server";

export async function GET(request: Request) {
  try {
    const listRequest = parsePandaVideoListRequest(new URL(request.url).searchParams);
    const rawData = await fetchPandaVideo("/videos", buildPandaVideoListSearchParams(listRequest));
    const videos = normalizePandaVideos(rawData);

    return Response.json({
      videos,
      page: listRequest.page,
      limit: listRequest.limit,
      hasMore: videos.length === listRequest.limit,
    });
  } catch (error: unknown) {
    return pandaVideoErrorResponse(error);
  }
}
