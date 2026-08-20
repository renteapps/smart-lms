export type ProfilePreferences = {
  name: string;
  username: string;
  avatarUrl: string | null;
  email: string;
  role: string;
  company: string;
  phone: string;
  birthDate: string;
  gender: string;
  country: string;
  state: string;
  city: string;
  bio: string;
  weeklyGoal: number;
  lessonReminders: boolean;
  emailDigest: boolean;
  achievementAlerts: boolean;
};

export const PROFILE_STORAGE_KEY = "@smartlms:profile";
export const PROFILE_SAVED_EVENT = "smartlms:profile-saved";

export const CAREER_ROLES = [
  "Estudante",
  "Estagiário / Trainee",
  "Júnior / Assistente (Início de carreira)",
  "Pleno / Analista",
  "Sênior / Especialista",
  "Liderança (Coordenador, Gerente, Diretor, C-Level)",
  "Empreendedor / Autônomo",
  "Em transição de carreira",
] as const;

export const GENDER_OPTIONS = [
  "Feminino",
  "Masculino",
  "Não-binário",
  "Prefiro não informar",
  "Outro",
] as const;

export const defaultProfile: ProfilePreferences = {
  name: "Mariana Costa",
  username: "mariana_costa",
  avatarUrl: null,
  email: "mariana.costa@acme.com",
  role: "Liderança (Coordenador, Gerente, Diretor, C-Level)",
  company: "Acme Brasil",
  phone: "(11) 98765-4321",
  birthDate: "1990-05-15",
  gender: "Feminino",
  country: "Brasil",
  state: "SP",
  city: "São Paulo",
  bio: "Líder de pessoas apaixonada por cultura, desenvolvimento e conversas que geram transformação.",
  weeklyGoal: 4,
  lessonReminders: true,
  emailDigest: true,
  achievementAlerts: false,
};
