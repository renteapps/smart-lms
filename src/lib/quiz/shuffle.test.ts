import { describe, expect, it } from "vitest";
import { hashString, shuffledWithSeed } from "./shuffle";

describe("shuffledWithSeed", () => {
  it("is deterministic: same items + same seed always produce the same order", () => {
    const items = ["a", "b", "c", "d", "e", "f"];
    const first = shuffledWithSeed(items, 12345);
    const second = shuffledWithSeed(items, 12345);
    expect(second).toEqual(first);
  });

  it("does not mutate the input array", () => {
    const items = ["a", "b", "c"];
    const original = [...items];
    shuffledWithSeed(items, 42);
    expect(items).toEqual(original);
  });

  it("preserves the same set of items, just reordered", () => {
    const items = [1, 2, 3, 4, 5];
    const result = shuffledWithSeed(items, 999);
    expect(result.slice().sort()).toEqual(items.slice().sort());
  });

  it("different seeds tend to produce different orders", () => {
    const items = Array.from({ length: 8 }, (_, i) => i);
    const a = shuffledWithSeed(items, 1);
    const b = shuffledWithSeed(items, 2);
    expect(a).not.toEqual(b);
  });
});

describe("hashString", () => {
  it("is deterministic for the same input", () => {
    expect(hashString("question-123")).toBe(hashString("question-123"));
  });

  it("differs for different inputs (no trivial collisions on typical ids)", () => {
    expect(hashString("question-1")).not.toBe(hashString("question-2"));
  });
});
