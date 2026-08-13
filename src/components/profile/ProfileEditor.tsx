"use client";

import { FormEvent, useEffect, useState } from "react";
import { BellRing, CheckCircle2, LockKeyhole, Save, ShieldCheck, Target, UserRound } from "lucide-react";
import {
  Button,
  Card,
  Description,
  FieldError,
  Fieldset,
  Input,
  Label,
  Switch,
  TextArea,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from "@heroui/react";

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

const BIO_LIMIT = 180;

type TextKey = keyof Pick<
  ProfilePreferences,
  "name" | "email" | "role" | "company" | "phone" | "birthDate" | "gender" | "country" | "state" | "city"
>;

type ProfileFieldProps = {
  id: TextKey;
  label: string;
  value: string;
  type?: "text" | "email" | "tel" | "date";
  placeholder?: string;
  description?: string;
  autoComplete?: string;
  isRequired?: boolean;
  onChange: (value: string) => void;
};

/**
 * Campo do formulário no padrão do design system: rótulo, campo, ajuda e erro
 * vêm do React Aria — a validação é do componente, não de estado manual.
 */
function ProfileField({
  id,
  label,
  value,
  type = "text",
  placeholder,
  description,
  autoComplete,
  isRequired,
  onChange,
}: ProfileFieldProps) {
  return (
    <TextField id={id} name={id} type={type} value={value} onChange={onChange} isRequired={isRequired}>
      <Label>{label}</Label>
      <Input placeholder={placeholder} autoComplete={autoComplete} />
      {description && <Description>{description}</Description>}
      <FieldError />
    </TextField>
  );
}

type SectionHeaderProps = {
  id: string;
  title: string;
  description: string;
  icon: typeof UserRound;
  tone: string;
};

function SectionHeader({ id, title, description, icon: Icon, tone }: SectionHeaderProps) {
  return (
    <Card.Header className="flex-row items-start gap-3 border-b border-hairline pb-5">
      <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${tone}`}>
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div>
        <Card.Title id={id} className="font-display text-xl font-extrabold tracking-[-0.025em] text-foreground">
          {title}
        </Card.Title>
        <Card.Description className="mt-1 leading-6">{description}</Card.Description>
      </div>
    </Card.Header>
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
      <section aria-labelledby="personal-data-title">
        <Card className="border-hairline">
          <SectionHeader
            id="personal-data-title"
            title="Informações pessoais"
            description="Esses dados ajudam a personalizar conteúdos e comunicações."
            icon={UserRound}
            tone="bg-accent-soft text-accent-soft-foreground"
          />

          <Card.Content className="grid gap-5 pt-6 sm:grid-cols-2">
            <ProfileField
              id="name"
              label="Nome completo"
              value={profile.name}
              autoComplete="name"
              isRequired
              onChange={(value) => updateProfile("name", value)}
            />
            <ProfileField
              id="email"
              label="E-mail"
              type="email"
              value={profile.email}
              autoComplete="email"
              isRequired
              onChange={(value) => updateProfile("email", value)}
            />
            <ProfileField
              id="phone"
              label="Telefone"
              type="tel"
              value={profile.phone}
              placeholder="(00) 00000-0000"
              autoComplete="tel"
              onChange={(value) => updateProfile("phone", value)}
            />
            <ProfileField
              id="birthDate"
              label="Data de nascimento"
              type="date"
              value={profile.birthDate}
              autoComplete="bday"
              onChange={(value) => updateProfile("birthDate", value)}
            />
            <ProfileField
              id="gender"
              label="Gênero"
              value={profile.gender}
              placeholder="Feminino, Masculino, Outro…"
              onChange={(value) => updateProfile("gender", value)}
            />
            <ProfileField
              id="role"
              label="Cargo"
              value={profile.role}
              autoComplete="organization-title"
              onChange={(value) => updateProfile("role", value)}
            />
            <ProfileField
              id="company"
              label="Empresa"
              value={profile.company}
              autoComplete="organization"
              onChange={(value) => updateProfile("company", value)}
            />
            <ProfileField
              id="country"
              label="País"
              value={profile.country}
              autoComplete="country-name"
              onChange={(value) => updateProfile("country", value)}
            />
            <ProfileField
              id="state"
              label="Estado"
              value={profile.state}
              autoComplete="address-level1"
              onChange={(value) => updateProfile("state", value)}
            />
            <ProfileField
              id="city"
              label="Cidade"
              value={profile.city}
              autoComplete="address-level2"
              onChange={(value) => updateProfile("city", value)}
            />

            <TextField
              id="bio"
              name="bio"
              value={profile.bio}
              maxLength={BIO_LIMIT}
              onChange={(value) => updateProfile("bio", value)}
              className="sm:col-span-2"
            >
              <Label>Sobre você</Label>
              <TextArea rows={4} placeholder="Uma frase sobre o que você faz e o que quer desenvolver." />
              <Description className="flex items-center justify-between gap-3">
                <span>Aparece no seu cartão de perfil.</span>
                <span data-numeric>
                  {profile.bio.length}/{BIO_LIMIT}
                </span>
              </Description>
            </TextField>
          </Card.Content>
        </Card>
      </section>

      <section aria-labelledby="learning-preferences-title">
        <Card className="border-hairline">
          <SectionHeader
            id="learning-preferences-title"
            title="Ritmo de aprendizagem"
            description="Escolha uma meta realista para manter a constância sem sobrecarga."
            icon={Target}
            tone="bg-warning-soft text-warning-soft-foreground"
          />

          <Card.Content className="pt-6">
            <Fieldset>
              <Fieldset.Legend>Meta de aulas por semana</Fieldset.Legend>
              <Fieldset.Group className="mt-3">
                <ToggleButtonGroup
                  aria-label="Meta de aulas por semana"
                  selectionMode="single"
                  disallowEmptySelection
                  isDetached
                  selectedKeys={[String(profile.weeklyGoal)]}
                  onSelectionChange={(keys) => {
                    const [next] = Array.from(keys);
                    if (next !== undefined) updateProfile("weeklyGoal", Number(next));
                  }}
                  className="grid grid-cols-2 gap-3 sm:grid-cols-4"
                >
                  {weeklyGoals.map((goal) => (
                    <ToggleButton key={goal} id={String(goal)} className="h-auto min-h-16 flex-col items-start gap-0.5 py-3">
                      <span className="font-display text-xl font-extrabold" data-numeric>
                        {goal}
                      </span>
                      <span className="text-xs font-semibold">aulas / semana</span>
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Fieldset.Group>
            </Fieldset>
          </Card.Content>
        </Card>
      </section>

      <section aria-labelledby="notifications-title">
        <Card className="border-hairline">
          <SectionHeader
            id="notifications-title"
            title="Notificações"
            description="Escolha os lembretes que realmente ajudam na sua rotina."
            icon={BellRing}
            tone="bg-success-soft text-success-soft-foreground"
          />

          <Card.Content className="divide-y divide-hairline pt-2">
            <Switch
              isSelected={profile.lessonReminders}
              onChange={(value) => updateProfile("lessonReminders", value)}
              className="justify-between gap-5 py-4"
            >
              <Switch.Content className="text-left">
                <span className="block text-sm font-bold text-foreground">Lembretes de aula</span>
                <span className="mt-1 block text-sm leading-5 text-muted">
                  Receba um aviso quando uma nova prática da sua trilha estiver disponível.
                </span>
              </Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
            </Switch>

            <Switch
              isSelected={profile.emailDigest}
              onChange={(value) => updateProfile("emailDigest", value)}
              className="justify-between gap-5 py-4"
            >
              <Switch.Content className="text-left">
                <span className="block text-sm font-bold text-foreground">Resumo semanal por e-mail</span>
                <span className="mt-1 block text-sm leading-5 text-muted">
                  Uma visão breve do seu progresso e dos próximos passos recomendados.
                </span>
              </Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
            </Switch>

            <Switch
              isSelected={profile.achievementAlerts}
              onChange={(value) => updateProfile("achievementAlerts", value)}
              className="justify-between gap-5 py-4"
            >
              <Switch.Content className="text-left">
                <span className="block text-sm font-bold text-foreground">Conquistas e marcos</span>
                <span className="mt-1 block text-sm leading-5 text-muted">
                  Comemore conclusões de cursos, sequências e metas alcançadas.
                </span>
              </Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
            </Switch>
          </Card.Content>
        </Card>
      </section>

      <section aria-labelledby="security-title">
        <Card className="border-hairline">
          <Card.Content className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-default text-default-foreground">
                <ShieldCheck className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h3
                  id="security-title"
                  className="font-display text-xl font-extrabold tracking-[-0.025em] text-foreground"
                >
                  Conta e segurança
                </h3>
                <p className="mt-1 text-sm leading-6 text-muted">Sua senha foi atualizada há 42 dias.</p>
              </div>
            </div>
            <Button type="button" variant="outline">
              <LockKeyhole className="size-4" aria-hidden="true" /> Alterar senha
            </Button>
          </Card.Content>
        </Card>
      </section>

      {/*
       * Barra de ações persistente: o formulário é longo e a decisão de salvar
       * precisa acompanhar a rolagem. Acrílico porque há conteúdo passando
       * por trás — `thick` para manter o contraste do texto.
       */}
      <div className="material-thick sticky bottom-4 z-10 flex flex-col gap-3 rounded-2xl p-3.5 sm:flex-row sm:items-center sm:justify-between">
        <p aria-live="polite" className="min-h-5 text-sm text-muted">
          {saveState === "saved" ? (
            <span className="inline-flex items-center gap-2 font-semibold text-success">
              <CheckCircle2 className="size-4" aria-hidden="true" /> Alterações salvas neste dispositivo.
            </span>
          ) : hasChanges ? (
            "Você tem alterações ainda não salvas."
          ) : (
            "Seus dados estão atualizados."
          )}
        </p>
        <Button type="submit" variant="primary" isDisabled={!hasChanges}>
          <Save className="size-4" aria-hidden="true" /> Salvar alterações
        </Button>
      </div>
    </form>
  );
}
