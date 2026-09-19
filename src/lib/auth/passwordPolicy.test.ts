import { describe, expect, it } from "vitest";
import { passwordPolicyError } from "@/lib/auth/passwordPolicy";

describe("passwordPolicyError (espelho da política do Supabase Auth)", () => {
  it("aceita 8+ caracteres com letra e número", () => {
    expect(passwordPolicyError("senha123")).toBeNull();
    expect(passwordPolicyError("ABCdef99!")).toBeNull();
  });

  it("recusa senha curta", () => {
    expect(passwordPolicyError("abc1234")).toMatch(/8 caracteres/);
  });

  it("recusa senha sem letra ou sem número", () => {
    expect(passwordPolicyError("12345678")).toMatch(/letra e um número/);
    expect(passwordPolicyError("abcdefgh")).toMatch(/letra e um número/);
  });
});
