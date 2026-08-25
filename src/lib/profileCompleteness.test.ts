import { describe, expect, it } from "vitest";
import { isProfileComplete, missingProfileFields } from "./profileCompleteness";

const COMPLETE = {
  fullName: "Carolina Mendes",
  username: "carolinamendes",
  phone: "+5511999998888",
  birthDate: "1990-05-20",
  gender: "Feminino",
  careerRole: "Analista",
};

describe("isProfileComplete", () => {
  it("perfil com os seis campos preenchidos está completo", () => {
    expect(isProfileComplete(COMPLETE)).toBe(true);
  });

  it("conta criada pelo webhook de compra (só nome e telefone) está incompleta", () => {
    expect(isProfileComplete({ fullName: "Carolina Mendes", phone: "+5511999998888" })).toBe(false);
  });

  it("qualquer campo ausente derruba a completude", () => {
    for (const field of Object.keys(COMPLETE) as (keyof typeof COMPLETE)[]) {
      expect(isProfileComplete({ ...COMPLETE, [field]: null })).toBe(false);
      expect(isProfileComplete({ ...COMPLETE, [field]: "" })).toBe(false);
      expect(isProfileComplete({ ...COMPLETE, [field]: "   " })).toBe(false);
    }
  });

  it("perfil totalmente vazio está incompleto", () => {
    expect(isProfileComplete({})).toBe(false);
  });
});

describe("missingProfileFields", () => {
  it("lista nenhum campo quando está tudo preenchido", () => {
    expect(missingProfileFields(COMPLETE)).toEqual([]);
  });

  it("lista exatamente os campos que faltam, na ordem definida", () => {
    expect(missingProfileFields({ fullName: "Carolina Mendes", phone: "+5511999998888" }))
      .toEqual(["username", "birthDate", "gender", "careerRole"]);
  });
});
