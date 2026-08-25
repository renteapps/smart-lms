import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { POST } from "./route";

describe("POST /api/webhooks/eduzz", () => {
  it("recusa Content-Length acima de 1 MiB sem ler o corpo", async () => {
    const request = new NextRequest("http://localhost/api/webhooks/eduzz", {
      method: "POST",
      headers: { "content-length": "1048577" },
      body: "{}",
    });
    expect((await POST(request)).status).toBe(413);
  });

  it("recusa corpo real acima do limite mesmo sem Content-Length confiável", async () => {
    const request = new NextRequest("http://localhost/api/webhooks/eduzz", {
      method: "POST",
      headers: { "content-length": "0" },
      body: "x".repeat(1_048_577),
    });
    expect((await POST(request)).status).toBe(413);
  });
});
