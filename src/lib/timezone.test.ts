import { describe, it, expect } from "vitest";
import {
  PLATFORM_TIMEZONE,
  getArticleStatus,
  formatPlatformDate,
  formatPlatformDateTime,
  isoToSaoPauloLocalInput,
  saoPauloLocalInputToIso,
} from "./timezone";

describe("timezone utilities", () => {
  it("defines São Paulo as default timezone", () => {
    expect(PLATFORM_TIMEZONE).toBe("America/Sao_Paulo");
  });

  describe("getArticleStatus", () => {
    it("returns 'draft' when isPublished is false", () => {
      expect(getArticleStatus(false, new Date().toISOString())).toBe("draft");
      expect(getArticleStatus(false, null)).toBe("draft");
    });

    it("returns 'scheduled' when isPublished is true and publishedAt is in the future", () => {
      const future = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
      expect(getArticleStatus(true, future)).toBe("scheduled");
    });

    it("returns 'published' when isPublished is true and publishedAt is in the past or now", () => {
      const past = new Date(Date.now() - 1000 * 60 * 60).toISOString();
      expect(getArticleStatus(true, past)).toBe("published");
    });
  });

  describe("formatPlatformDate & formatPlatformDateTime", () => {
    it("formats dates in São Paulo timezone with pt-BR locale", () => {
      // 2026-08-25T01:00:00.000Z is 2026-08-24 22:00 in São Paulo (UTC-3)
      const utcDate = "2026-08-25T01:00:00.000Z";
      const formattedDate = formatPlatformDate(utcDate);
      expect(formattedDate).toContain("24");
      expect(formattedDate).toContain("2026");

      const formattedDateTime = formatPlatformDateTime(utcDate);
      expect(formattedDateTime).toContain("24/08/2026 às 22:00");
    });

    it("handles null or invalid dates gracefully", () => {
      expect(formatPlatformDate(null)).toBe("—");
      expect(formatPlatformDateTime("invalid-date")).toBe("—");
    });
  });

  describe("isoToSaoPauloLocalInput & saoPauloLocalInputToIso bidirectional conversion", () => {
    it("converts ISO UTC date to São Paulo local datetime input format", () => {
      // 2026-08-24 15:30 UTC -> 2026-08-24 12:30 in São Paulo
      const iso = "2026-08-24T15:30:00.000Z";
      const localInput = isoToSaoPauloLocalInput(iso);
      expect(localInput).toBe("2026-08-24T12:30");
    });

    it("converts local datetime input back to exact ISO UTC timestamp", () => {
      const localInput = "2026-08-24T12:30";
      const iso = saoPauloLocalInputToIso(localInput);
      expect(iso).toBe("2026-08-24T15:30:00.000Z");
    });

    it("preserves round-trip consistency", () => {
      const originalLocal = "2026-09-01T09:45";
      const iso = saoPauloLocalInputToIso(originalLocal);
      const roundTripLocal = isoToSaoPauloLocalInput(iso);
      expect(roundTripLocal).toBe(originalLocal);
    });
  });
});
