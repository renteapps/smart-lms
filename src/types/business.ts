export type CompanyPlanType = "mensal" | "anual" | "corporativo_custom";

export type CompanyStatus = "ativo" | "inativo" | "suspenso" | "trial";

export type MemberRole = "gestor" | "colaborador" | "lider_equipe";

export type MemberStatus = "ativo" | "convidado" | "desativado";

export interface Company {
  id: string;
  name: string; // Razão social
  tradeName: string; // Nome fantasia
  cnpj: string;
  domain?: string; // ex: acme.com (para auto-admissão de colaboradores)
  autoDomainApproval?: boolean;
  logoUrl?: string;
  managerName: string;
  managerEmail: string;
  managerPhone?: string;
  seatsTotal: number;
  seatsUsed: number;
  planType: CompanyPlanType;
  status: CompanyStatus;
  contractStart: string; // YYYY-MM-DD
  contractEnd: string; // YYYY-MM-DD
  contractValue: number; // Valor mensal ou total
  allowedCourseIds: string[]; // Cursos inclusos no pacote corporativo (ou vazio para todos)
  departments: string[]; // Departamentos cadastrados (ex: TI, RH, Comercial)
  createdAt: string;
  updatedAt: string;
}

export interface CompanyMember {
  id: string;
  companyId: string;
  name: string;
  email: string;
  roleInCompany: MemberRole;
  department: string;
  jobTitle?: string;
  status: MemberStatus;
  invitedAt: string;
  joinedAt?: string;
  lastAccessAt?: string;
  progressPercentage: number; // 0 - 100
  completedCoursesCount: number;
  assignedCourseIds: string[];
  certificatesCount: number;
  notes?: string;
}

export interface CompanyInvite {
  id: string;
  companyId: string;
  email: string;
  name?: string;
  department?: string;
  roleInCompany: MemberRole;
  invitedBy: string;
  token: string;
  status: "pendente" | "aceito" | "cancelado" | "expirado";
  createdAt: string;
  expiresAt: string;
}

export interface DepartmentStat {
  department: string;
  memberCount: number;
  completionRate: number;
  activeCount: number;
}

export interface CompanyCourseStat {
  courseId: string;
  courseTitle: string;
  category: string;
  enrolledCount: number;
  completedCount: number;
  avgProgress: number;
}

export interface CompanyAnalytics {
  seatsTotal: number;
  seatsUsed: number;
  seatsAvailable: number;
  activeThisWeek: number;
  averageProgress: number;
  totalHoursWatched: number;
  certificatesIssued: number;
  departmentStats: DepartmentStat[];
  courseStats: CompanyCourseStat[];
}
