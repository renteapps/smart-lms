import { filterPandaFoldersByParent, normalizePandaFolders } from "@/lib/pandavideo";
import { fetchPandaVideo, pandaVideoErrorResponse } from "@/lib/pandavideo-server";

export async function GET(request: Request) {
  try {
    const parentFolderId = (new URL(request.url).searchParams.get("parent_folder_id") ?? "").trim();
    const params = new URLSearchParams({ status: "true" });
    if (parentFolderId) params.set("parent_folder_id", parentFolderId);

    const rawData = await fetchPandaVideo("/folders", params);
    const folders = filterPandaFoldersByParent(normalizePandaFolders(rawData), parentFolderId || null);
    return Response.json({ folders });
  } catch (error) {
    return pandaVideoErrorResponse(error);
  }
}
