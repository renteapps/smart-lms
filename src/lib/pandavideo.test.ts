import { describe, expect, it } from "vitest";
import {
  buildPandaVideoListSearchParams,
  filterPandaFoldersByParent,
  formatPandaVideoDuration,
  normalizePandaFolders,
  normalizePandaVideo,
  normalizePandaVideos,
  parsePandaVideoListRequest,
  secondsToLessonMinutes,
} from "./pandavideo";

describe("PandaVideo API normalization", () => {
  it("accepts video arrays and the documented videos envelope", () => {
    const rawVideo = {
      id: "11111111-2222-3333-4444-555555555555",
      title: "Aula de liderança",
      status: "CONVERTED",
      length: 125,
      folder_id: null,
      video_player: "https://player.pandavideo.com.br/embed/?v=video",
      thumbnail: "https://cdn.example.com/thumb.jpg",
    };

    expect(normalizePandaVideos([rawVideo])).toEqual(normalizePandaVideos({ videos: [rawVideo] }));
    expect(normalizePandaVideo(rawVideo)).toMatchObject({
      title: "Aula de liderança",
      length: 125,
      folderId: null,
      videoPlayer: "https://player.pandavideo.com.br/embed/?v=video",
    });
  });

  it("accepts both folder response shapes and ignores inactive folders", () => {
    const folders = [
      {
        id: "folder-a",
        name: "Curso A",
        parent_folder_id: null,
        videos_count: "12",
        status: true,
      },
      {
        id: "folder-disabled",
        name: "Antiga",
        parent_folder_id: null,
        videos_count: "3",
        status: false,
      },
    ];

    expect(normalizePandaFolders(folders)).toEqual(normalizePandaFolders({ folders }));
    expect(normalizePandaFolders(folders)).toEqual([
      { id: "folder-a", name: "Curso A", parentFolderId: null, videosCount: 12 },
    ]);
  });

  it("drops malformed items without failing the complete response", () => {
    expect(normalizePandaVideos({ videos: [null, { id: "only-id" }] })).toEqual([]);
    expect(normalizePandaFolders({ folders: [null, { id: "only-id" }] })).toEqual([]);
  });

  it("keeps only direct children of the requested folder", () => {
    const folders = normalizePandaFolders([
      { id: "root", name: "Root", parent_folder_id: null },
      { id: "child", name: "Child", parent_folder_id: "root" },
      { id: "grandchild", name: "Grandchild", parent_folder_id: "child" },
    ]);

    expect(filterPandaFoldersByParent(folders, null).map((folder) => folder.id)).toEqual(["root"]);
    expect(filterPandaFoldersByParent(folders, "root").map((folder) => folder.id)).toEqual(["child"]);
  });
});

describe("PandaVideo list request", () => {
  it("uses the root folder by default and caps page size", () => {
    const parsed = parsePandaVideoListRequest(new URLSearchParams("page=2&limit=999"));
    expect(parsed).toEqual({ page: 2, limit: 48, title: "", folderId: null, rootFolder: true });
    expect(buildPandaVideoListSearchParams(parsed).toString()).toBe(
      "page=2&limit=48&status=CONVERTED&root_folder=1",
    );
  });

  it("scopes browsing to a folder", () => {
    const parsed = parsePandaVideoListRequest(new URLSearchParams("folder_id=folder-a"));
    const forwarded = buildPandaVideoListSearchParams(parsed);
    expect(forwarded.get("folder_id")).toBe("folder-a");
    expect(forwarded.has("root_folder")).toBe(false);
  });

  it("makes title searches global even when a folder is present", () => {
    const parsed = parsePandaVideoListRequest(new URLSearchParams("title=lideran%C3%A7a&folder_id=folder-a"));
    const forwarded = buildPandaVideoListSearchParams(parsed);
    expect(parsed.folderId).toBeNull();
    expect(forwarded.get("title")).toBe("liderança");
    expect(forwarded.has("folder_id")).toBe(false);
    expect(forwarded.has("root_folder")).toBe(false);
  });
});

describe("PandaVideo duration", () => {
  it("rounds lesson duration up while preserving an editable integer field", () => {
    expect(secondsToLessonMinutes(1)).toBe(1);
    expect(secondsToLessonMinutes(60)).toBe(1);
    expect(secondsToLessonMinutes(61)).toBe(2);
    expect(secondsToLessonMinutes(3601)).toBe(61);
  });

  it("formats player durations", () => {
    expect(formatPandaVideoDuration(9)).toBe("0:09");
    expect(formatPandaVideoDuration(125)).toBe("2:05");
    expect(formatPandaVideoDuration(3725)).toBe("1:02:05");
  });
});
