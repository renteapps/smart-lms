"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  BellRing,
  BriefcaseBusiness,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Globe,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  Target,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ProfilePreferences = {
  name: string;
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

export const defaultProfile: ProfilePreferences = {
  name: "Mariana Costa",
  email: "mariana.costa@acme.com",
  role: "Head de Pessoas",
  company: "Acme Brasil",
  phone: "(11) 98765-4321",
  birthDate: "1990-05-15",
  gender: "Feminino",
  country: "Brasil",
  state: "São Paulo",
  city: "São Paulo",
  bio: "Líder de pessoas apaixonada por cultura, desenvolvimento e conversas que geram transformação.",
  weeklyGoal: 4,
  lessonReminders: true,
  emailDigest: true,
  achievementAlerts: false,
};

const weeklyGoals = [2, 3, 4, 5];

type FieldProps = {
  id: keyof Pick<ProfilePreferences, "name" | "email" | "role" | "company" | "phone" | "birthDate" | "gender" | "country" | "state" | "city">;
  label: string;
  value: string;
  icon: typeof UserRound;
  type?: "text" | "email" | "date";
  placeholder?: string;
  onChange: (value: string) => void;
};

function Field({ id, label, value, icon: Icon, type = "text", placeholder, onChange }: FieldProps) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-2 block text-sm font-bold text-ink">{label}</span>
      <span className="relative block">
        <Icon className="absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-text-mute" aria-hidden="true" />
        <input
          id={id}
          name={id}
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className="h-12 w-full rounded-[10px] border border-border bg-surface pl-11 pr-3.5 text-sm text-ink shadow-sm outline-none placeholder:text-text-mute focus:border-primary focus:ring-3 focus:ring-primary/10"
        />
      </span>
    </label>
  );
}

type PreferenceSwitchProps = {
  checked: boolean;
  title: string;
  description: string;
  onChange: (checked: boolean) => void;
};

function PreferenceSwitch({ checked, title, description, onChange }: PreferenceSwitchProps) {
  return (
    <div className="flex items-center justify-between gap-5 py-4 first:pt-0 last:pb-0">
      <div>
        <p className="text-sm font-bold text-ink">{title}</p>
        <p className="mt-1 text-sm leading-5 text-text-soft">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full border p-0.5 transition-[background-color,border-color]",
          checked ? "border-primary bg-primary" : "border-border bg-canvas-soft"
        )}
      >
        <span
          className={cn(
            "grid h-5.5 w-5.5 place-items-center rounded-full bg-white shadow-sm transition-transform",
            checked && "translate-x-5"
          )}
        >
          {checked && <Check className="h-3 w-3 text-primary" aria-hidden="true" />}
        </span>
      </button>
    </div>
  );
}

export function ProfileEditor() {
  const [profile, setProfile] = useState<ProfilePreferences>(defaultProfile);
  const [savedProfile, setSavedProfile] = useState<ProfilePreferences>(defaultProfile);
  const [saveState, setSaveState] = useState<"idle" | "saved">("idle");

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (!stored) return;

      try {
        const parsed = JSON.parse(stored) as Partial<ProfilePreferences>;
        const restored = { ...defaultProfile, ...parsed };
        setProfile(restored);
        setSavedProfile(restored);
      } catch {
        // Mantém os dados de demonstração quando o conteúdo local é inválido.
      }
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  const hasChanges = JSON.stringify(profile) !== JSON.stringify(savedProfile);

  const updateProfile = <Key extends keyof ProfilePreferences>(key: Key, value: ProfilePreferences[Key]) => {
    setProfile((current) => ({ ...current, [key]: value }));
    setSaveState("idle");
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    setSavedProfile(profile);
    setSaveState("saved");
    window.dispatchEvent(new CustomEvent<ProfilePreferences>(PROFILE_SAVED_EVENT, { detail: profile }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="editorial-card p-5 sm:p-7" aria-labelledby="personal-data-title">
        <div className="flex items-start gap-3 border-b border-border pb-5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-primary-pale text-primary-active">
            <UserRound className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 id="personal-data-title" className="text-xl font-extrabold tracking-[-0.025em] text-ink">Informações pessoais</h2>
            <p className="mt-1 text-sm leading-6 text-text-soft">Esses dados ajudam a personalizar conteúdos e comunicações.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <Field id="name" label="Nome completo" value={profile.name} icon={UserRound} onChange={(value) => updateProfile("name", value)} />
          <Field id="email" label="E-mail" type="email" value={profile.email} icon={Mail} onChange={(value) => updateProfile("email", value)} />
          <Field id="phone" label="Telefone" value={profile.phone} icon={Phone} placeholder="(00) 00000-0000" onChange={(value) => updateProfile("phone", value)} />
          <Field id="birthDate" label="Data de Nascimento" type="date" value={profile.birthDate} icon={Calendar} onChange={(value) => updateProfile("birthDate", value)} />
          <Field id="gender" label="Gênero" value={profile.gender} icon={UserRound} placeholder="Feminino, Masculino, Outro..." onChange={(value) => updateProfile("gender", value)} />
          <Field id="role" label="Cargo" value={profile.role} icon={BriefcaseBusiness} onChange={(value) => updateProfile("role", value)} />
          <Field id="company" label="Empresa" value={profile.company} icon={Building2} onChange={(value) => updateProfile("company", value)} />
          <Field id="country" label="País" value={profile.country} icon={Globe} onChange={(value) => updateProfile("country", value)} />
          <Field id="state" label="Estado" value={profile.state} icon={MapPin} onChange={(value) => updateProfile("state", value)} />
          <Field id="city" label="Cidade" value={profile.city} icon={MapPin} onChange={(value) => updateProfile("city", value)} />
        </div>

        <label htmlFor="bio" className="mt-5 block">
          <span className="mb-2 flex items-center justify-between gap-3 text-sm font-bold text-ink">
            Sobre você <span className="text-xs font-medium text-text-mute">{profile.bio.length}/180</span>
          </span>
          <textarea
            id="bio"
            name="bio"
            value={profile.bio}
            maxLength={180}
            rows={4}
            onChange={(event) => updateProfile("bio", event.target.value)}
            className="w-full resize-none rounded-[10px] border border-border bg-surface px-3.5 py-3 text-sm leading-6 text-ink shadow-sm outline-none placeholder:text-text-mute focus:border-primary focus:ring-3 focus:ring-primary/10"
          />
        </label>
      </section>

      <section className="editorial-card p-5 sm:p-7" aria-labelledby="learning-preferences-title">
        <div className="flex items-start gap-3 border-b border-border pb-5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-accent-orange/12 text-accent-orange">
            <Target className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 id="learning-preferences-title" className="text-xl font-extrabold tracking-[-0.025em] text-ink">Ritmo de aprendizagem</h2>
            <p className="mt-1 text-sm leading-6 text-text-soft">Escolha uma meta realista para manter a constância sem sobrecarga.</p>
          </div>
        </div>

        <fieldset className="mt-6">
          <legend className="text-sm font-bold text-ink">Meta de aulas por semana</legend>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {weeklyGoals.map((goal) => {
              const selected = profile.weeklyGoal === goal;
              return (
                <button
                  key={goal}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => updateProfile("weeklyGoal", goal)}
                  className={cn(
                    "min-h-16 rounded-[10px] border px-3 text-left",
                    selected
                      ? "border-primary bg-primary-pale text-primary-active shadow-sm"
                      : "border-border bg-surface text-text-soft hover:border-primary/30 hover:text-ink"
                  )}
                >
                  <span className="block font-display text-xl font-extrabold">{goal}</span>
                  <span className="text-xs font-semibold">aulas / semana</span>
                </button>
              );
            })}
          </div>
        </fieldset>
      </section>

      <section className="editorial-card p-5 sm:p-7" aria-labelledby="notifications-title">
        <div className="flex items-start gap-3 border-b border-border pb-5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-accent-sage/15 text-positive">
            <BellRing className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 id="notifications-title" className="text-xl font-extrabold tracking-[-0.025em] text-ink">Notificações</h2>
            <p className="mt-1 text-sm leading-6 text-text-soft">Escolha os lembretes que realmente ajudam na sua rotina.</p>
          </div>
        </div>

        <div className="mt-5 divide-y divide-border">
          <PreferenceSwitch
            checked={profile.lessonReminders}
            title="Lembretes de aula"
            description="Receba um aviso quando uma nova prática da sua trilha estiver disponível."
            onChange={(value) => updateProfile("lessonReminders", value)}
          />
          <PreferenceSwitch
            checked={profile.emailDigest}
            title="Resumo semanal por e-mail"
            description="Uma visão breve do seu progresso e dos próximos passos recomendados."
            onChange={(value) => updateProfile("emailDigest", value)}
          />
          <PreferenceSwitch
            checked={profile.achievementAlerts}
            title="Conquistas e marcos"
            description="Comemore conclusões de cursos, sequências e metas alcançadas."
            onChange={(value) => updateProfile("achievementAlerts", value)}
          />
        </div>
      </section>

      <section className="editorial-card p-5 sm:p-7" aria-labelledby="security-title">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-canvas-soft text-text-soft">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 id="security-title" className="text-xl font-extrabold tracking-[-0.025em] text-ink">Conta e segurança</h2>
              <p className="mt-1 text-sm leading-6 text-text-soft">Sua senha foi atualizada há 42 dias.</p>
            </div>
          </div>
          <button type="button" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-border bg-surface px-4 text-sm font-bold text-ink hover:border-primary/30 hover:text-primary-active">
            <LockKeyhole className="h-4 w-4" aria-hidden="true" /> Alterar senha
          </button>
        </div>
      </section>

      <div className="flex flex-col gap-3 rounded-[12px] border border-border bg-surface p-3.5 shadow-[var(--shadow-card)] sm:flex-row sm:items-center sm:justify-between">
        <p aria-live="polite" className="min-h-5 text-sm font-semibold text-text-soft">
          {saveState === "saved" ? (
            <span className="inline-flex items-center gap-2 text-positive"><CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Alterações salvas neste dispositivo.</span>
          ) : hasChanges ? (
            "Você tem alterações ainda não salvas."
          ) : (
            "Seus dados estão atualizados."
          )}
        </p>
        <button
          type="submit"
          disabled={!hasChanges}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] bg-primary px-5 text-sm font-bold text-on-primary shadow-sm hover:bg-primary-active disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Save className="h-4 w-4" aria-hidden="true" /> Salvar alterações
        </button>
      </div>
    </form>
  );
}
