import { describe, it, expect } from "vitest";
import { calculateExpiresAt } from "@/lib/enrollmentUtils";

describe("calculateExpiresAt", () => {
  const baseDate = new Date("2026-08-20T12:00:00.000Z");

  it("retorna null para acesso indeterminado / vitalício", () => {
    const result = calculateExpiresAt("indefinite", null, baseDate);
    expect(result).toBeNull();
  });

  it("calcula corretamente +30 dias", () => {
    const result = calculateExpiresAt("30d", null, baseDate);
    expect(result).toBe("2026-09-19T23:59:59.999Z");
  });

  it("calcula corretamente +90 dias", () => {
    const result = calculateExpiresAt("90d", null, baseDate);
    expect(result).toBe("2026-11-18T23:59:59.999Z");
  });

  it("calcula corretamente +180 dias", () => {
    const result = calculateExpiresAt("180d", null, baseDate);
    expect(result).toBe("2027-02-16T23:59:59.999Z");
  });

  it("calcula corretamente +365 dias", () => {
    const result = calculateExpiresAt("365d", null, baseDate);
    expect(result).toBe("2027-08-20T23:59:59.999Z");
  });

  it("calcula corretamente com data customizada YYYY-MM-DD", () => {
    const result = calculateExpiresAt("custom", "2026-12-31", baseDate);
    expect(result).toBe("2026-12-31T23:59:59.999Z");
  });

  it("calcula corretamente com ISO string personalizada", () => {
    const customIso = "2027-01-15T15:30:00.000Z";
    const result = calculateExpiresAt("custom", customIso, baseDate);
    expect(result).toBe(customIso);
  });

  it("lança erro se tipo custom for chamado sem data", () => {
    expect(() => calculateExpiresAt("custom", null, baseDate)).toThrowError(
      "Data personalizada não informada."
    );
  });

  it("lança erro para data inválida", () => {
    expect(() => calculateExpiresAt("custom", "data-invalida", baseDate)).toThrowError(
      "Data personalizada inválida."
    );
  });
});

describe("Enrollment Action Inputs", () => {
  it("valida parâmetros de entrada para createEnrollment", async () => {
    const { createEnrollment } = await import("./enrollments");
    
    // Sem userId e courseId
    const res1 = await createEnrollment({
      userId: "",
      courseId: "",
      expirationType: "indefinite",
    });
    expect(res1.success).toBe(false);
    expect(res1.message).toBe("Usuário e curso são obrigatórios.");

    // Sem courseId
    const res2 = await createEnrollment({
      userId: "user-123",
      courseId: "",
      expirationType: "indefinite",
    });
    expect(res2.success).toBe(false);
    expect(res2.message).toBe("Usuário e curso são obrigatórios.");
  });

  it("valida parâmetros de entrada para updateEnrollmentExpiration", async () => {
    const { updateEnrollmentExpiration } = await import("./enrollments");
    
    const res = await updateEnrollmentExpiration({
      enrollmentId: "",
      userId: "user-123",
      expirationType: "indefinite",
    });
    expect(res.success).toBe(false);
    expect(res.message).toBe("ID da matrícula é obrigatório.");
  });

  it("valida parâmetros de entrada para deleteEnrollment", async () => {
    const { deleteEnrollment } = await import("./enrollments");
    
    // Sem enrollmentId e sem courseId
    const res = await deleteEnrollment({
      enrollmentId: "",
      userId: "user-123",
    });
    expect(res.success).toBe(false);
    expect(res.message).toBe("ID da matrícula é obrigatório.");

    // Sem enrollmentId, userId e courseId
    const res2 = await deleteEnrollment({
      enrollmentId: "",
      userId: "",
      courseId: "",
    });
    expect(res2.success).toBe(false);
    expect(res2.message).toBe("ID da matrícula é obrigatório.");
  });
});
