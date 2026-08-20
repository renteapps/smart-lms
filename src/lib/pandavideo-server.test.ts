import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/auth", () => ({ requireAdmin: vi.fn() }));

import { requireAdmin } from "@/lib/supabase/auth";
import { fetchPandaVideo, pandaVideoErrorResponse, PandaVideoApiError } from "./pandavideo-server";

const mockedRequireAdmin = vi.mocked(requireAdmin);

function mockIntegration(data: unknown, error: unknown = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error });
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });
  mockedRequireAdmin.mockResolvedValue({ adminClient: { from } } as never);
  return { from, select, eq, maybeSingle };
}

describe("PandaVideo server client", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    delete process.env.PANDAVIDEO_API_KEY;
  });

  it("rejects non-admin sessions before contacting PandaVideo", async () => {
    mockedRequireAdmin.mockRejectedValue(new Error("Acesso restrito a administradores."));
    const upstreamFetch = vi.fn();
    vi.stubGlobal("fetch", upstreamFetch);

    let caught: unknown;
    try {
      await fetchPandaVideo("/videos");
    } catch (error) {
      caught = error;
    }

    const response = pandaVideoErrorResponse(caught);
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ code: "FORBIDDEN" });
    expect(upstreamFetch).not.toHaveBeenCalled();
  });

  it("uses the stored key without a Bearer prefix or client credential fallback", async () => {
    mockIntegration({ enabled: true, secrets: { apiKey: "secret-panda-key" } });
    const upstreamFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ videos: [] }), { status: 200 }));
    vi.stubGlobal("fetch", upstreamFetch);

    await fetchPandaVideo("/videos", new URLSearchParams({ page: "1" }));

    expect(upstreamFetch).toHaveBeenCalledOnce();
    const [url, init] = upstreamFetch.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.toString()).toBe("https://api-v2.pandavideo.com.br/videos?page=1");
    expect(new Headers(init.headers).get("Authorization")).toBe("secret-panda-key");
  });

  it("returns a configuration error without exposing secrets", async () => {
    mockIntegration(null);

    let caught: unknown;
    try {
      await fetchPandaVideo("/videos");
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(PandaVideoApiError);
    const response = pandaVideoErrorResponse(caught);
    expect(response.status).toBe(400);
    const body = await response.json() as { error: string; code: string };
    expect(body.code).toBe("PANDAVIDEO_NOT_CONFIGURED");
    expect(body.error).not.toContain("apiKey");
  });

  it("sanitizes upstream authentication errors", async () => {
    mockIntegration({ enabled: true, secrets: { apiKey: "do-not-leak" } });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("upstream private response", { status: 401 })));

    let caught: unknown;
    try {
      await fetchPandaVideo("/videos");
    } catch (error) {
      caught = error;
    }

    const response = pandaVideoErrorResponse(caught);
    const body = await response.json() as { error: string };
    expect(response.status).toBe(401);
    expect(body.error).toBe("A chave da integração PandaVideo foi recusada.");
    expect(body.error).not.toContain("do-not-leak");
    expect(body.error).not.toContain("upstream private response");
  });
});
