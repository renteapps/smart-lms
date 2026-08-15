import {
  Company,
  CompanyAnalytics,
  CompanyCourseStat,
  CompanyInvite,
  CompanyMember,
  DepartmentStat,
  MemberRole,
} from "@/types/business";
import { CATALOG_COURSES } from "@/lib/catalog";

export const BUSINESS_STORAGE_KEY = "@smartlms:business:v1";
export const SELECTED_COMPANY_STORAGE_KEY = "@smartlms:selected_company:v1";

// Sementes realistas de empresas
export const SEED_COMPANIES: Company[] = [
  {
    id: "comp-techcorp",
    name: "TechCorp Soluções Digitais Ltda",
    tradeName: "TechCorp",
    cnpj: "12.345.678/0001-90",
    domain: "techcorp.io",
    autoDomainApproval: true,
    logoUrl: "https://images.unsplash.com/photo-1542744094-3a31f272c490?q=80&w=200&auto=format&fit=crop",
    managerName: "Carla Albuquerque",
    managerEmail: "carla.albuquerque@techcorp.io",
    managerPhone: "(11) 98765-4321",
    seatsTotal: 50,
    seatsUsed: 38,
    planType: "anual",
    status: "ativo",
    contractStart: "2026-01-15",
    contractEnd: "2027-01-15",
    contractValue: 4900,
    allowedCourseIds: ["c1", "c2", "c3", "c4", "c5", "c6"],
    departments: ["Engenharia", "Produto", "Design", "RH", "Vendas"],
    createdAt: "2026-01-15T09:00:00.000Z",
    updatedAt: "2026-08-10T14:30:00.000Z",
  },
  {
    id: "comp-bancofuturo",
    name: "Banco Futuro Instituição Financeira S.A.",
    tradeName: "Banco Futuro",
    cnpj: "98.765.432/0001-10",
    domain: "bancofuturo.com.br",
    autoDomainApproval: true,
    logoUrl: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?q=80&w=200&auto=format&fit=crop",
    managerName: "Eduardo Medeiros",
    managerEmail: "eduardo.medeiros@bancofuturo.com.br",
    managerPhone: "(11) 97654-3210",
    seatsTotal: 120,
    seatsUsed: 94,
    planType: "anual",
    status: "ativo",
    contractStart: "2025-11-01",
    contractEnd: "2026-11-01",
    contractValue: 11500,
    allowedCourseIds: ["c1", "c2", "c3", "c4", "c5", "c6"],
    departments: ["Tecnologia", "Crédito & Risco", "Compliance", "Atendimento", "Liderança"],
    createdAt: "2025-11-01T10:00:00.000Z",
    updatedAt: "2026-08-12T16:00:00.000Z",
  },
  {
    id: "comp-inovaretail",
    name: "Inova Retail Distribuição e Comércio S.A.",
    tradeName: "Inova Retail",
    cnpj: "45.123.890/0001-55",
    domain: "inovaretail.com.br",
    autoDomainApproval: false,
    logoUrl: "https://images.unsplash.com/photo-1472851294608-062f824d29cc?q=80&w=200&auto=format&fit=crop",
    managerName: "Juliana Rios",
    managerEmail: "juliana.rios@inovaretail.com.br",
    managerPhone: "(21) 99123-8899",
    seatsTotal: 30,
    seatsUsed: 28,
    planType: "mensal",
    status: "ativo",
    contractStart: "2026-03-01",
    contractEnd: "2027-03-01",
    contractValue: 3200,
    allowedCourseIds: ["c1", "c2", "c4", "c5"],
    departments: ["Vendas", "Marketing", "Operações & Logística", "Gente & Gestão"],
    createdAt: "2026-03-01T11:00:00.000Z",
    updatedAt: "2026-08-14T09:15:00.000Z",
  },
  {
    id: "comp-agroverde",
    name: "AgroVerde Soluções Sustentáveis S.A.",
    tradeName: "AgroVerde",
    cnpj: "67.890.123/0001-44",
    domain: "agroverde.agr.br",
    autoDomainApproval: false,
    managerName: "Marcos Vinícius",
    managerEmail: "marcos@agroverde.agr.br",
    managerPhone: "(62) 98877-6655",
    seatsTotal: 15,
    seatsUsed: 0,
    planType: "corporativo_custom",
    status: "trial",
    contractStart: "2026-08-01",
    contractEnd: "2026-08-31",
    contractValue: 0,
    allowedCourseIds: ["c1", "c3"],
    departments: ["Operações", "Diretoria", "Agronomia"],
    createdAt: "2026-08-01T08:00:00.000Z",
    updatedAt: "2026-08-01T08:00:00.000Z",
  },
];

// Sementes realistas de colaboradores
export const SEED_MEMBERS: CompanyMember[] = [
  // TechCorp
  {
    id: "mem-tc-1",
    companyId: "comp-techcorp",
    name: "Carla Albuquerque",
    email: "carla.albuquerque@techcorp.io",
    roleInCompany: "gestor",
    department: "RH",
    jobTitle: "Head de Pessoas & Cultura",
    status: "ativo",
    invitedAt: "2026-01-15T09:30:00.000Z",
    joinedAt: "2026-01-15T10:00:00.000Z",
    lastAccessAt: "Hoje, 09:15",
    progressPercentage: 88,
    completedCoursesCount: 3,
    assignedCourseIds: ["c1", "c3", "c4"],
    certificatesCount: 2,
  },
  {
    id: "mem-tc-2",
    companyId: "comp-techcorp",
    name: "Lucas Ferreira",
    email: "lucas.ferreira@techcorp.io",
    roleInCompany: "lider_equipe",
    department: "Engenharia",
    jobTitle: "Tech Lead Frontend",
    status: "ativo",
    invitedAt: "2026-01-16T10:00:00.000Z",
    joinedAt: "2026-01-16T11:20:00.000Z",
    lastAccessAt: "Hoje, 10:45",
    progressPercentage: 75,
    completedCoursesCount: 2,
    assignedCourseIds: ["c1", "c2", "c3"],
    certificatesCount: 2,
  },
  {
    id: "mem-tc-3",
    companyId: "comp-techcorp",
    name: "Mariana Sampaio",
    email: "mariana.sampaio@techcorp.io",
    roleInCompany: "colaborador",
    department: "Engenharia",
    jobTitle: "Engenheira de Software Pleno",
    status: "ativo",
    invitedAt: "2026-01-20T14:00:00.000Z",
    joinedAt: "2026-01-21T09:00:00.000Z",
    lastAccessAt: "Ontem, 16:30",
    progressPercentage: 62,
    completedCoursesCount: 1,
    assignedCourseIds: ["c1", "c2"],
    certificatesCount: 1,
  },
  {
    id: "mem-tc-4",
    companyId: "comp-techcorp",
    name: "Gabriel Santos",
    email: "gabriel.santos@techcorp.io",
    roleInCompany: "colaborador",
    department: "Produto",
    jobTitle: "Product Manager",
    status: "ativo",
    invitedAt: "2026-02-01T08:00:00.000Z",
    joinedAt: "2026-02-02T10:15:00.000Z",
    lastAccessAt: "Hoje, 08:30",
    progressPercentage: 92,
    completedCoursesCount: 4,
    assignedCourseIds: ["c1", "c3", "c4", "c5"],
    certificatesCount: 3,
  },
  {
    id: "mem-tc-5",
    companyId: "comp-techcorp",
    name: "Beatriz Nogueira",
    email: "beatriz.nogueira@techcorp.io",
    roleInCompany: "colaborador",
    department: "Design",
    jobTitle: "Product Designer Sênior",
    status: "ativo",
    invitedAt: "2026-02-10T11:00:00.000Z",
    joinedAt: "2026-02-11T14:20:00.000Z",
    lastAccessAt: "13 ago, 15:10",
    progressPercentage: 54,
    completedCoursesCount: 1,
    assignedCourseIds: ["c1", "c4"],
    certificatesCount: 1,
  },
  {
    id: "mem-tc-6",
    companyId: "comp-techcorp",
    name: "Thiago Rocha",
    email: "thiago.rocha@techcorp.io",
    roleInCompany: "colaborador",
    department: "Vendas",
    jobTitle: "Executivo de Contas",
    status: "ativo",
    invitedAt: "2026-03-05T09:00:00.000Z",
    joinedAt: "2026-03-06T11:00:00.000Z",
    lastAccessAt: "Hoje, 11:20",
    progressPercentage: 80,
    completedCoursesCount: 2,
    assignedCourseIds: ["c1", "c5", "c6"],
    certificatesCount: 2,
  },
  {
    id: "mem-tc-7",
    companyId: "comp-techcorp",
    name: "Renata Vianna",
    email: "renata.vianna@techcorp.io",
    roleInCompany: "colaborador",
    department: "RH",
    jobTitle: "Analista de T&D",
    status: "ativo",
    invitedAt: "2026-04-12T10:00:00.000Z",
    joinedAt: "2026-04-13T09:40:00.000Z",
    lastAccessAt: "Hoje, 10:10",
    progressPercentage: 68,
    completedCoursesCount: 2,
    assignedCourseIds: ["c1", "c3", "c4"],
    certificatesCount: 1,
  },
  {
    id: "mem-tc-8",
    companyId: "comp-techcorp",
    name: "Felipe Andrade",
    email: "felipe.andrade@techcorp.io",
    roleInCompany: "colaborador",
    department: "Engenharia",
    jobTitle: "Desenvolvedor Backend",
    status: "convidado",
    invitedAt: "2026-08-14T15:30:00.000Z",
    progressPercentage: 0,
    completedCoursesCount: 0,
    assignedCourseIds: ["c1", "c2"],
    certificatesCount: 0,
  },
  {
    id: "mem-tc-9",
    companyId: "comp-techcorp",
    name: "Camila Guimarães",
    email: "camila.guimaraes@techcorp.io",
    roleInCompany: "colaborador",
    department: "Vendas",
    jobTitle: "SDR",
    status: "convidado",
    invitedAt: "2026-08-14T16:00:00.000Z",
    progressPercentage: 0,
    completedCoursesCount: 0,
    assignedCourseIds: ["c1", "c5"],
    certificatesCount: 0,
  },

  // Banco Futuro
  {
    id: "mem-bf-1",
    companyId: "comp-bancofuturo",
    name: "Eduardo Medeiros",
    email: "eduardo.medeiros@bancofuturo.com.br",
    roleInCompany: "gestor",
    department: "Liderança",
    jobTitle: "Diretor Executivo",
    status: "ativo",
    invitedAt: "2025-11-01T10:00:00.000Z",
    joinedAt: "2025-11-01T10:30:00.000Z",
    lastAccessAt: "Hoje, 08:00",
    progressPercentage: 95,
    completedCoursesCount: 4,
    assignedCourseIds: ["c1", "c3", "c4", "c6"],
    certificatesCount: 4,
  },
  {
    id: "mem-bf-2",
    companyId: "comp-bancofuturo",
    name: "Patrícia Antunes",
    email: "patricia.antunes@bancofuturo.com.br",
    roleInCompany: "lider_equipe",
    department: "Compliance",
    jobTitle: "Gerente de Compliance",
    status: "ativo",
    invitedAt: "2025-11-05T09:00:00.000Z",
    joinedAt: "2025-11-06T14:00:00.000Z",
    lastAccessAt: "Hoje, 10:20",
    progressPercentage: 84,
    completedCoursesCount: 3,
    assignedCourseIds: ["c1", "c2", "c4"],
    certificatesCount: 3,
  },
];

export interface BusinessStoreState {
  companies: Company[];
  members: CompanyMember[];
  invites: CompanyInvite[];
}

let memoryState: BusinessStoreState | null = null;

export function resetBusinessStore(): void {
  memoryState = {
    companies: JSON.parse(JSON.stringify(SEED_COMPANIES)),
    members: JSON.parse(JSON.stringify(SEED_MEMBERS)),
    invites: [],
  };
  memorySimulatedManager = null;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(BUSINESS_STORAGE_KEY);
      window.localStorage.removeItem(SIMULATED_MANAGER_STORAGE_KEY);
    } catch {
      // Ignorar erro no localStorage
    }
  }
}

export function readBusinessStore(): BusinessStoreState {
  if (typeof window === "undefined") {
    if (!memoryState) {
      memoryState = {
        companies: JSON.parse(JSON.stringify(SEED_COMPANIES)),
        members: JSON.parse(JSON.stringify(SEED_MEMBERS)),
        invites: [],
      };
    }
    return memoryState;
  }

  try {
    const raw = window.localStorage.getItem(BUSINESS_STORAGE_KEY);
    if (!raw) {
      const initial: BusinessStoreState = {
        companies: JSON.parse(JSON.stringify(SEED_COMPANIES)),
        members: JSON.parse(JSON.stringify(SEED_MEMBERS)),
        invites: [],
      };
      window.localStorage.setItem(BUSINESS_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    return {
      companies: Array.isArray(parsed?.companies) ? parsed.companies : JSON.parse(JSON.stringify(SEED_COMPANIES)),
      members: Array.isArray(parsed?.members) ? parsed.members : JSON.parse(JSON.stringify(SEED_MEMBERS)),
      invites: Array.isArray(parsed?.invites) ? parsed.invites : [],
    };
  } catch {
    return {
      companies: JSON.parse(JSON.stringify(SEED_COMPANIES)),
      members: JSON.parse(JSON.stringify(SEED_MEMBERS)),
      invites: [],
    };
  }
}

export function saveBusinessStore(state: BusinessStoreState): boolean {
  if (typeof window === "undefined") {
    memoryState = state;
    return true;
  }
  try {
    window.localStorage.setItem(BUSINESS_STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

// -------------------------------------------------------------
// OPERAÇÕES DE EMPRESA
// -------------------------------------------------------------

export function getCompanies(): Company[] {
  const store = readBusinessStore();
  return store.companies.map((company) => {
    const activeCount = store.members.filter(
      (m) => m.companyId === company.id && m.status !== "desativado"
    ).length;
    return {
      ...company,
      seatsUsed: activeCount,
    };
  });
}

export function getCompanyById(id: string): Company | null {
  const companies = getCompanies();
  return companies.find((c) => c.id === id) || null;
}

export function saveCompany(companyData: Partial<Company> & { name: string; tradeName: string; seatsTotal: number }): Company {
  const store = readBusinessStore();
  const now = new Date().toISOString();

  let target: Company;

  if (companyData.id) {
    const idx = store.companies.findIndex((c) => c.id === companyData.id);
    if (idx >= 0) {
      target = {
        ...store.companies[idx],
        ...companyData,
        updatedAt: now,
      };
      store.companies[idx] = target;
    } else {
      target = {
        id: companyData.id,
        name: companyData.name,
        tradeName: companyData.tradeName,
        cnpj: companyData.cnpj || "00.000.000/0001-00",
        domain: companyData.domain || "",
        autoDomainApproval: companyData.autoDomainApproval ?? true,
        logoUrl: companyData.logoUrl || "",
        managerName: companyData.managerName || "Gestor Responsável",
        managerEmail: companyData.managerEmail || "gestor@empresa.com",
        managerPhone: companyData.managerPhone || "",
        seatsTotal: Number(companyData.seatsTotal) || 10,
        seatsUsed: companyData.seatsUsed || 0,
        planType: companyData.planType || "anual",
        status: companyData.status || "ativo",
        contractStart: companyData.contractStart || now.slice(0, 10),
        contractEnd: companyData.contractEnd || new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
        contractValue: Number(companyData.contractValue) || 2900,
        allowedCourseIds: companyData.allowedCourseIds || CATALOG_COURSES.map((c) => c.id),
        departments: companyData.departments || ["Geral", "RH", "Tecnologia", "Vendas"],
        createdAt: now,
        updatedAt: now,
      };
      store.companies.push(target);
    }
  } else {
    const newId = `comp-${Date.now()}`;
    target = {
      id: newId,
      name: companyData.name,
      tradeName: companyData.tradeName,
      cnpj: companyData.cnpj || "00.000.000/0001-00",
      domain: companyData.domain || "",
      autoDomainApproval: companyData.autoDomainApproval ?? true,
      logoUrl: companyData.logoUrl || "",
      managerName: companyData.managerName || "Gestor Responsável",
      managerEmail: companyData.managerEmail || "gestor@empresa.com",
      managerPhone: companyData.managerPhone || "",
      seatsTotal: Number(companyData.seatsTotal) || 10,
      seatsUsed: 0,
      planType: companyData.planType || "anual",
      status: companyData.status || "ativo",
      contractStart: companyData.contractStart || now.slice(0, 10),
      contractEnd: companyData.contractEnd || new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
      contractValue: Number(companyData.contractValue) || 2900,
      allowedCourseIds: companyData.allowedCourseIds || CATALOG_COURSES.map((c) => c.id),
      departments: companyData.departments || ["Geral", "RH", "Tecnologia", "Vendas"],
      createdAt: now,
      updatedAt: now,
    };
    store.companies.push(target);
  }

  saveBusinessStore(store);
  return target;
}

export function deleteCompany(companyId: string): boolean {
  const store = readBusinessStore();
  store.companies = store.companies.filter((c) => c.id !== companyId);
  store.members = store.members.filter((m) => m.companyId !== companyId);
  store.invites = store.invites.filter((i) => i.companyId !== companyId);
  return saveBusinessStore(store);
}

// -------------------------------------------------------------
// OPERAÇÕES DE COLABORADORES E VAGAS
// -------------------------------------------------------------

export function getCompanyMembers(companyId: string): CompanyMember[] {
  const store = readBusinessStore();
  return store.members.filter((m) => m.companyId === companyId);
}

export function getAvailableSeats(companyId: string): number {
  const company = getCompanyById(companyId);
  if (!company) return 0;
  const store = readBusinessStore();
  const occupiedCount = store.members.filter(
    (m) => m.companyId === companyId && m.status !== "desativado"
  ).length;
  return Math.max(0, company.seatsTotal - occupiedCount);
}

export function inviteMember(
  companyId: string,
  data: {
    name: string;
    email: string;
    department: string;
    jobTitle?: string;
    roleInCompany?: MemberRole;
    assignedCourseIds?: string[];
  }
): { success: boolean; member?: CompanyMember; error?: string } {
  const store = readBusinessStore();
  const company = store.companies.find((c) => c.id === companyId);

  if (!company) {
    return { success: false, error: "Empresa não encontrada" };
  }

  const occupiedCount = store.members.filter(
    (m) => m.companyId === companyId && m.status !== "desativado"
  ).length;

  if (occupiedCount >= company.seatsTotal) {
    return {
      success: false,
      error: `Limite de vagas atingido (${company.seatsTotal}/${company.seatsTotal}). Faça um upgrade do plano corporativo para adicionar mais colaboradores.`,
    };
  }

  // Verifica se email já existe na mesma empresa
  const existing = store.members.find(
    (m) => m.companyId === companyId && m.email.toLowerCase() === data.email.toLowerCase()
  );

  if (existing && existing.status !== "desativado") {
    return {
      success: false,
      error: `O e-mail ${data.email} já está cadastrado nesta empresa com status ${existing.status}.`,
    };
  }

  const now = new Date().toISOString();
  const newMember: CompanyMember = {
    id: `mem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    companyId,
    name: data.name.trim(),
    email: data.email.trim().toLowerCase(),
    roleInCompany: data.roleInCompany || "colaborador",
    department: data.department || "Geral",
    jobTitle: data.jobTitle || "",
    status: "convidado",
    invitedAt: now,
    progressPercentage: 0,
    completedCoursesCount: 0,
    assignedCourseIds: data.assignedCourseIds && data.assignedCourseIds.length > 0
      ? data.assignedCourseIds
      : company.allowedCourseIds.slice(0, 3),
    certificatesCount: 0,
  };

  if (existing && existing.status === "desativado") {
    // Reativa o membro
    const idx = store.members.findIndex((m) => m.id === existing.id);
    store.members[idx] = newMember;
  } else {
    store.members.push(newMember);
  }

  // Atualiza a lista de departamentos da empresa se for novo
  if (!company.departments.includes(newMember.department)) {
    company.departments.push(newMember.department);
  }

  // Atualiza contador de vagas usadas
  company.seatsUsed = occupiedCount + 1;
  company.updatedAt = now;

  saveBusinessStore(store);
  return { success: true, member: newMember };
}

export function bulkInviteMembers(
  companyId: string,
  items: Array<{
    name: string;
    email: string;
    department?: string;
    jobTitle?: string;
  }>
): { success: boolean; addedCount: number; errors: string[] } {
  const store = readBusinessStore();
  const company = store.companies.find((c) => c.id === companyId);

  if (!company) {
    return { success: false, addedCount: 0, errors: ["Empresa não encontrada"] };
  }

  let occupiedCount = store.members.filter(
    (m) => m.companyId === companyId && m.status !== "desativado"
  ).length;

  const availableSeats = company.seatsTotal - occupiedCount;
  if (availableSeats <= 0) {
    return {
      success: false,
      addedCount: 0,
      errors: [`Não há vagas disponíveis no plano atual (${company.seatsTotal}/${company.seatsTotal}).`],
    };
  }

  const errors: string[] = [];
  let addedCount = 0;
  const now = new Date().toISOString();

  for (const item of items) {
    if (occupiedCount >= company.seatsTotal) {
      errors.push(`Limite atingido ao processar ${item.email}. Restante não foi importado.`);
      break;
    }

    if (!item.email || !item.email.includes("@")) {
      errors.push(`E-mail inválido: ${item.email}`);
      continue;
    }

    const emailClean = item.email.trim().toLowerCase();
    const existing = store.members.find(
      (m) => m.companyId === companyId && m.email.toLowerCase() === emailClean && m.status !== "desativado"
    );

    if (existing) {
      errors.push(`E-mail já cadastrado: ${emailClean}`);
      continue;
    }

    const dept = item.department?.trim() || "Geral";
    const newMember: CompanyMember = {
      id: `mem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      companyId,
      name: item.name?.trim() || emailClean.split("@")[0],
      email: emailClean,
      roleInCompany: "colaborador",
      department: dept,
      jobTitle: item.jobTitle || "",
      status: "convidado",
      invitedAt: now,
      progressPercentage: 0,
      completedCoursesCount: 0,
      assignedCourseIds: company.allowedCourseIds.slice(0, 3),
      certificatesCount: 0,
    };

    store.members.push(newMember);
    if (!company.departments.includes(dept)) {
      company.departments.push(dept);
    }
    occupiedCount += 1;
    addedCount += 1;
  }

  company.seatsUsed = occupiedCount;
  company.updatedAt = now;
  saveBusinessStore(store);

  return {
    success: addedCount > 0,
    addedCount,
    errors,
  };
}

export function updateMember(member: CompanyMember): boolean {
  const store = readBusinessStore();
  const idx = store.members.findIndex((m) => m.id === member.id);
  if (idx === -1) return false;

  store.members[idx] = member;
  return saveBusinessStore(store);
}

export function removeMember(memberId: string): boolean {
  const store = readBusinessStore();
  const member = store.members.find((m) => m.id === memberId);
  if (!member) return false;

  const company = store.companies.find((c) => c.id === member.companyId);
  store.members = store.members.filter((m) => m.id !== memberId);

  if (company) {
    const occupiedCount = store.members.filter(
      (m) => m.companyId === company.id && m.status !== "desativado"
    ).length;
    company.seatsUsed = occupiedCount;
    company.updatedAt = new Date().toISOString();
  }

  return saveBusinessStore(store);
}

export function deactivateMember(memberId: string): boolean {
  const store = readBusinessStore();
  const member = store.members.find((m) => m.id === memberId);
  if (!member) return false;

  member.status = "desativado";
  const company = store.companies.find((c) => c.id === member.companyId);
  if (company) {
    const occupiedCount = store.members.filter(
      (m) => m.companyId === company.id && m.status !== "desativado"
    ).length;
    company.seatsUsed = occupiedCount;
    company.updatedAt = new Date().toISOString();
  }

  return saveBusinessStore(store);
}

export function resendInvite(memberId: string): { success: boolean; message: string } {
  const store = readBusinessStore();
  const member = store.members.find((m) => m.id === memberId);
  if (!member) return { success: false, message: "Colaborador não encontrado" };

  member.invitedAt = new Date().toISOString();
  saveBusinessStore(store);
  return {
    success: true,
    message: `Convite reenviado com sucesso para ${member.email}! Link de ativação renovado por 7 dias.`,
  };
}

// -------------------------------------------------------------
// ATRIBUIÇÃO DE CURSOS E TRILHAS
// -------------------------------------------------------------

export function assignCoursesToMember(memberId: string, courseIds: string[]): boolean {
  const store = readBusinessStore();
  const member = store.members.find((m) => m.id === memberId);
  if (!member) return false;

  member.assignedCourseIds = Array.from(new Set([...member.assignedCourseIds, ...courseIds]));
  return saveBusinessStore(store);
}

export function assignCoursesToDepartment(
  companyId: string,
  department: string,
  courseIds: string[]
): { success: boolean; affectedMembersCount: number } {
  const store = readBusinessStore();
  const members = store.members.filter(
    (m) => m.companyId === companyId && m.department === department && m.status !== "desativado"
  );

  for (const m of members) {
    m.assignedCourseIds = Array.from(new Set([...m.assignedCourseIds, ...courseIds]));
  }

  saveBusinessStore(store);
  return { success: true, affectedMembersCount: members.length };
}

// -------------------------------------------------------------
// ANÁLISES E MÉTRICAS DA EMPRESA
// -------------------------------------------------------------

export function getCompanyAnalytics(companyId: string): CompanyAnalytics {
  const store = readBusinessStore();
  const company = store.companies.find((c) => c.id === companyId);
  const members = store.members.filter(
    (m) => m.companyId === companyId && m.status !== "desativado"
  );

  const seatsTotal = company ? company.seatsTotal : 0;
  const seatsUsed = members.length;
  const seatsAvailable = Math.max(0, seatsTotal - seatsUsed);

  const activeMembers = members.filter((m) => m.status === "ativo");
  const avgProgress =
    activeMembers.length > 0
      ? Math.round(
          activeMembers.reduce((acc, m) => acc + (m.progressPercentage || 0), 0) /
            activeMembers.length
        )
      : 0;

  const totalCerts = members.reduce((acc, m) => acc + (m.certificatesCount || 0), 0);
  const totalHours = Math.round(
    members.reduce((acc, m) => acc + (m.completedCoursesCount * 3.5 + (m.progressPercentage / 100) * 2), 0)
  );

  // Departamentos
  const depts = Array.from(new Set(members.map((m) => m.department)));
  const departmentStats: DepartmentStat[] = depts.map((dept) => {
    const deptMembers = members.filter((m) => m.department === dept);
    const activeDept = deptMembers.filter((m) => m.status === "ativo");
    const deptAvg =
      activeDept.length > 0
        ? Math.round(
            activeDept.reduce((acc, m) => acc + (m.progressPercentage || 0), 0) /
              activeDept.length
          )
        : 0;

    return {
      department: dept,
      memberCount: deptMembers.length,
      completionRate: deptAvg,
      activeCount: activeDept.length,
    };
  });

  // Estatísticas de Cursos
  const courseStats: CompanyCourseStat[] = CATALOG_COURSES.filter((c) =>
    company?.allowedCourseIds ? company.allowedCourseIds.includes(c.id) : true
  ).map((course) => {
    const enrolled = members.filter((m) => m.assignedCourseIds?.includes(course.id));
    const completed = enrolled.filter((m) => m.progressPercentage >= 100);
    const progressSum = enrolled.reduce((acc, m) => acc + m.progressPercentage, 0);

    return {
      courseId: course.id,
      courseTitle: course.title,
      category: course.category,
      enrolledCount: enrolled.length,
      completedCount: completed.length,
      avgProgress: enrolled.length > 0 ? Math.round(progressSum / enrolled.length) : 0,
    };
  });

  return {
    seatsTotal,
    seatsUsed,
    seatsAvailable,
    activeThisWeek: Math.max(1, Math.round(activeMembers.length * 0.85)),
    averageProgress: avgProgress,
    totalHoursWatched: totalHours,
    certificatesIssued: totalCerts,
    departmentStats,
    courseStats,
  };
}

// -------------------------------------------------------------
// SELETOR DA EMPRESA ATIVA (MULTI-TENANT SWITCHER PARA TESTES)
// -------------------------------------------------------------

export function getSelectedCompanyId(): string {
  if (typeof window === "undefined") return "comp-techcorp";
  try {
    return window.localStorage.getItem(SELECTED_COMPANY_STORAGE_KEY) || "comp-techcorp";
  } catch {
    return "comp-techcorp";
  }
}

export function setSelectedCompanyId(companyId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SELECTED_COMPANY_STORAGE_KEY, companyId);
  } catch {
    // Silencioso
  }
}

// -------------------------------------------------------------
// CONTROLE DE PERMISSÃO: GESTOR DE EMPRESA
// -------------------------------------------------------------

export const SIMULATED_MANAGER_STORAGE_KEY = "@smartlms:simulated_manager:v1";
let memorySimulatedManager: boolean | null = null;

export interface CompanyManagerStatus {
  isManager: boolean;
  managedCompanies: Company[];
  primaryCompany: Company | null;
  role: string | null;
}

export function checkIsCompanyManager(userEmail?: string | null): CompanyManagerStatus {
  const store = readBusinessStore();
  const companies = getCompanies();

  // 1. Verifica se há simulação de gestor ativa no storage ou memória
  if (typeof window !== "undefined") {
    try {
      const isSimulated = window.localStorage.getItem(SIMULATED_MANAGER_STORAGE_KEY);
      if (isSimulated === "true") {
        return {
          isManager: true,
          managedCompanies: companies,
          primaryCompany: companies[0] || null,
          role: "gestor",
        };
      }
      if (isSimulated === "false") {
        return {
          isManager: false,
          managedCompanies: [],
          primaryCompany: null,
          role: null,
        };
      }
    } catch {
      // ignore
    }
  } else if (memorySimulatedManager !== null) {
    if (memorySimulatedManager) {
      return {
        isManager: true,
        managedCompanies: companies,
        primaryCompany: companies[0] || null,
        role: "gestor",
      };
    } else {
      return {
        isManager: false,
        managedCompanies: [],
        primaryCompany: null,
        role: null,
      };
    }
  }

  // 2. Se email não foi fornecido, tenta buscar do perfil local
  let emailToCheck = userEmail;
  if (!emailToCheck && typeof window !== "undefined") {
    try {
      const storedProfile = window.localStorage.getItem("@smartlms:profile");
      if (storedProfile) {
        const parsed = JSON.parse(storedProfile);
        emailToCheck = parsed.email;
      }
    } catch {
      // ignore
    }
  }

  if (!emailToCheck) {
    return {
      isManager: false,
      managedCompanies: [],
      primaryCompany: null,
      role: null,
    };
  }

  const cleanEmail = emailToCheck.trim().toLowerCase();

  // 3. Checa se é o gestor direto de alguma empresa
  const directCompanies = companies.filter(
    (c) => c.managerEmail.trim().toLowerCase() === cleanEmail && c.status !== "inativo"
  );

  // 4. Checa se é membro com papel 'gestor' ou 'lider_equipe'
  const memberRecords = store.members.filter(
    (m) =>
      m.email.trim().toLowerCase() === cleanEmail &&
      (m.roleInCompany === "gestor" || m.roleInCompany === "lider_equipe") &&
      m.status === "ativo"
  );

  const memberCompanies = memberRecords
    .map((m) => companies.find((c) => c.id === m.companyId))
    .filter((c): c is Company => Boolean(c));

  const allManaged = Array.from(
    new Map([...directCompanies, ...memberCompanies].map((c) => [c.id, c])).values()
  );

  return {
    isManager: allManaged.length > 0,
    managedCompanies: allManaged,
    primaryCompany: allManaged[0] || null,
    role: allManaged.length > 0 ? "gestor" : null,
  };
}

export function setSimulatedManagerStatus(isManager: boolean | null): void {
  memorySimulatedManager = isManager;
  if (typeof window === "undefined") return;
  try {
    if (isManager === null) {
      window.localStorage.removeItem(SIMULATED_MANAGER_STORAGE_KEY);
    } else {
      window.localStorage.setItem(SIMULATED_MANAGER_STORAGE_KEY, String(isManager));
    }
    window.dispatchEvent(new Event("smartlms:manager_status_changed"));
  } catch {
    // ignore
  }
}
