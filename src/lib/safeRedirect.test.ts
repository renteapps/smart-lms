import { describe, expect, it } from "vitest";
import { safeRedirect } from "@/lib/safeRedirect";

describe("safeRedirect", () => {
  it("mantém caminhos internos com query e hash", () => {
    expect(safeRedirect("/minha-trilha")).toBe("/minha-trilha");
    expect(safeRedirect("/courses/x/lessons/y?t=10#notas")).toBe("/courses/x/lessons/y?t=10#notas");
  });

  it.each([
    "javascript:alert(document.cookie)",
    "JavaScript:alert(1)",
    " javascript:alert(1)",
    "https://evil.tld",
    "//evil.tld",
    "/\\evil.tld",
    "/\t/evil.tld",
    "\\\\evil.tld",
    "data:text/html,<script>alert(1)</script>",
    "minha-trilha",
    "",
  ])("recusa %j", (value) => {
    expect(safeRedirect(value)).toBe("/");
  });

  it("usa o fallback informado e ignora valores não-string", () => {
    expect(safeRedirect(null, "/onboarding")).toBe("/onboarding");
    expect(safeRedirect(undefined, "/onboarding")).toBe("/onboarding");
    expect(safeRedirect("//evil.tld", "/onboarding")).toBe("/onboarding");
  });
});
