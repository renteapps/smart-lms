import { beforeEach, describe, expect, it } from "vitest";
import {
  assignCoursesToDepartment,
  bulkInviteMembers,
  checkIsCompanyManager,
  deactivateMember,
  getAvailableSeats,
  getCompanies,
  getCompanyAnalytics,
  getCompanyById,
  getCompanyMembers,
  inviteMember,
  resetBusinessStore,
  saveCompany,
  setSimulatedManagerStatus,
} from "./businessStorage";

describe("Business Storage & B2B Management Logic", () => {
  beforeEach(() => {
    resetBusinessStore();
  });

  it("loads default seed companies", () => {
    const companies = getCompanies();
    expect(companies.length).toBeGreaterThanOrEqual(3);
    const techcorp = getCompanyById("comp-techcorp");
    expect(techcorp).toBeDefined();
    expect(techcorp?.tradeName).toBe("TechCorp");
  });

  it("calculates available seats correctly", () => {
    const techcorp = getCompanyById("comp-techcorp");
    expect(techcorp).toBeDefined();
    if (techcorp) {
      const seats = getAvailableSeats("comp-techcorp");
      expect(seats).toBe(techcorp.seatsTotal - techcorp.seatsUsed);
    }
  });

  it("invites a single member and decrements available seats", () => {
    const initialSeats = getAvailableSeats("comp-techcorp");
    const result = inviteMember("comp-techcorp", {
      name: "Novo Colaborador Teste",
      email: "novo.teste@techcorp.io",
      department: "Engenharia",
      jobTitle: "Dev",
    });

    expect(result.success).toBe(true);
    expect(result.member).toBeDefined();
    expect(result.member?.status).toBe("convidado");

    const newSeats = getAvailableSeats("comp-techcorp");
    expect(newSeats).toBe(initialSeats - 1);
  });

  it("blocks invite when seat quota is full", () => {
    const comp = saveCompany({
      name: "Empresa Limite 1",
      tradeName: "Limite",
      seatsTotal: 1,
    });

    const res1 = inviteMember(comp.id, {
      name: "User 1",
      email: "user1@limite.com",
      department: "TI",
    });
    expect(res1.success).toBe(true);

    const res2 = inviteMember(comp.id, {
      name: "User 2",
      email: "user2@limite.com",
      department: "TI",
    });
    expect(res2.success).toBe(false);
    expect(res2.error).toContain("Limite de vagas atingido");
  });

  it("handles bulk invitation and respects capacity limits", () => {
    const comp = saveCompany({
      name: "Empresa Lote",
      tradeName: "Lote",
      seatsTotal: 2,
    });

    const bulkResult = bulkInviteMembers(comp.id, [
      { name: "Bulk 1", email: "bulk1@lote.com", department: "TI" },
      { name: "Bulk 2", email: "bulk2@lote.com", department: "TI" },
      { name: "Bulk 3", email: "bulk3@lote.com", department: "TI" },
    ]);

    expect(bulkResult.addedCount).toBe(2);
    expect(bulkResult.errors.length).toBeGreaterThan(0);
    expect(getAvailableSeats(comp.id)).toBe(0);
  });

  it("deactivating a member frees up a seat", () => {
    const comp = saveCompany({
      name: "Empresa Desativação",
      tradeName: "Desativa",
      seatsTotal: 5,
    });

    const res = inviteMember(comp.id, {
      name: "Colaborador",
      email: "colab@desativa.com",
      department: "TI",
    });

    const memId = res.member!.id;
    expect(getAvailableSeats(comp.id)).toBe(4);

    deactivateMember(memId);
    expect(getAvailableSeats(comp.id)).toBe(5);
  });

  it("assigns courses to entire department", () => {
    const members = getCompanyMembers("comp-techcorp");
    const engMembers = members.filter((m) => m.department === "Engenharia");
    expect(engMembers.length).toBeGreaterThan(0);

    const assignRes = assignCoursesToDepartment("comp-techcorp", "Engenharia", ["c5", "c6"]);
    expect(assignRes.success).toBe(true);
    expect(assignRes.affectedMembersCount).toBe(engMembers.length);

    const updatedMembers = getCompanyMembers("comp-techcorp");
    const updatedEng = updatedMembers.filter((m) => m.department === "Engenharia");
    for (const m of updatedEng) {
      expect(m.assignedCourseIds).toContain("c5");
      expect(m.assignedCourseIds).toContain("c6");
    }
  });

  it("generates accurate company analytics", () => {
    const analytics = getCompanyAnalytics("comp-techcorp");
    expect(analytics.seatsTotal).toBe(50);
    expect(analytics.seatsUsed).toBeGreaterThan(0);
    expect(analytics.departmentStats.length).toBeGreaterThan(0);
    expect(analytics.courseStats.length).toBeGreaterThan(0);
  });

  it("accurately identifies company managers by email", () => {
    // Carla is manager of TechCorp
    const managerCheck = checkIsCompanyManager("carla.albuquerque@techcorp.io");
    expect(managerCheck.isManager).toBe(true);
    expect(managerCheck.managedCompanies.length).toBeGreaterThan(0);
    expect(managerCheck.primaryCompany?.tradeName).toBe("TechCorp");

    // Regular student / non-manager
    const nonManagerCheck = checkIsCompanyManager("aluno.comum@email.com");
    expect(nonManagerCheck.isManager).toBe(false);
    expect(nonManagerCheck.managedCompanies.length).toBe(0);
  });

  it("handles simulated manager mode correctly", () => {
    setSimulatedManagerStatus(true);
    const simulated = checkIsCompanyManager();
    expect(simulated.isManager).toBe(true);

    setSimulatedManagerStatus(false);
    const nonSimulated = checkIsCompanyManager("random@email.com");
    expect(nonSimulated.isManager).toBe(false);

    setSimulatedManagerStatus(null);
  });

  it("creates and retrieves a new company with custom departments, domains and allowed courses", () => {
    const created = saveCompany({
      name: "Empresa Inovadora S.A.",
      tradeName: "Inovadora",
      cnpj: "11.222.333/0001-44",
      domain: "inovadora.com.br",
      autoDomainApproval: true,
      managerName: "Gestor Teste",
      managerEmail: "gestor@inovadora.com.br",
      managerPhone: "(11) 91234-5678",
      seatsTotal: 75,
      planType: "anual",
      status: "ativo",
      contractValue: 5500,
      contractStart: "2026-08-15",
      contractEnd: "2027-08-15",
      allowedCourseIds: ["c1", "c2"],
      departments: ["Engenharia", "Design", "RH"],
    });

    expect(created.id).toBeDefined();
    expect(created.tradeName).toBe("Inovadora");

    const fetched = getCompanyById(created.id);
    expect(fetched).toBeDefined();
    expect(fetched?.cnpj).toBe("11.222.333/0001-44");
    expect(fetched?.domain).toBe("inovadora.com.br");
    expect(fetched?.autoDomainApproval).toBe(true);
    expect(fetched?.seatsTotal).toBe(75);
    expect(fetched?.contractValue).toBe(5500);
    expect(fetched?.allowedCourseIds).toEqual(["c1", "c2"]);
    expect(fetched?.departments).toEqual(["Engenharia", "Design", "RH"]);
  });
});

