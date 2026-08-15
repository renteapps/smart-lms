import { describe, expect, it } from "vitest";

describe("Password Strength Logic", () => {
  const evaluatePasswordStrength = (password: string) => {
    const hasMinLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    const metCount = [hasMinLength, hasUppercase, hasNumber, hasSpecial].filter(Boolean).length;

    if (!password) return { label: "", score: 0 };
    if (metCount <= 1) return { label: "Muito fraca", score: 1 };
    if (metCount === 2) return { label: "Razoável", score: 2 };
    if (metCount === 3) return { label: "Boa", score: 3 };
    return { label: "Forte e segura", score: 4 };
  };

  it("classifies empty password", () => {
    expect(evaluatePasswordStrength("").score).toBe(0);
  });

  it("classifies weak short password", () => {
    const result = evaluatePasswordStrength("123");
    expect(result.score).toBe(1);
    expect(result.label).toBe("Muito fraca");
  });

  it("classifies moderate password with length and uppercase", () => {
    const result = evaluatePasswordStrength("Password");
    expect(result.score).toBe(2);
    expect(result.label).toBe("Razoável");
  });

  it("classifies strong password with length, uppercase, numbers and symbols", () => {
    const result = evaluatePasswordStrength("SmartLMS@2026!");
    expect(result.score).toBe(4);
    expect(result.label).toBe("Forte e segura");
  });
});
