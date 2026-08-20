"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  BellRing,
  Camera,
  CheckCircle2,
  LockKeyhole,
  LogOut,
  Save,
  ShieldCheck,
  Target,
  UserRound,
} from "lucide-react";
import {
  Button,
  Card,
  Description,
  FieldError,
  Fieldset,
  Input,
  Label,
  ListBox,
  ListBoxItem,
  Select,
  Spinner,
  Switch,
  TextArea,
  TextField,
  toast,
  ToggleButton,
  ToggleButtonGroup,
} from "@heroui/react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  BRAZILIAN_STATES,
  COUNTRIES,
  getCitiesForState,
} from "@/lib/locationData";
import {
  defaultProfile,
  PROFILE_SAVED_EVENT,
  PROFILE_STORAGE_KEY,
  CAREER_ROLES,
  GENDER_OPTIONS,
  type ProfilePreferences,
} from "@/lib/profilePreferences";
import { PhoneInputField } from "@/components/ui/PhoneInputField";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { composeFullPhone, parseStoredPhone } from "@/lib/phoneUtils";

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  return `${parts[0][0]}${parts.length > 1 ? parts[parts.length - 1][0] : ""}`.toLocaleUpperCase("pt-BR");
}

const weeklyGoals = [2, 3, 4, 5];
const BIO_LIMIT = 180;

type TextKey = keyof Pick<
  ProfilePreferences,
  "name" | "username" | "email" | "role" | "company" | "phone" | "birthDate" | "gender" | "country" | "state" | "city"
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
  isDisabled?: boolean;
  onChange: (value: string) => void;
};

function ProfileField({
  id,
  label,
  value,
  type = "text",
  placeholder,
  description,
  autoComplete,
  isRequired,
  isDisabled,
  onChange,
}: ProfileFieldProps) {
  return (
    <TextField id={id} name={id} type={type} value={value} onChange={onChange} isRequired={isRequired} isDisabled={isDisabled} fullWidth>
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
  const [phoneDdi, setPhoneDdi] = useState("+55");
  const [savedPhoneDdi, setSavedPhoneDdi] = useState("+55");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [isProcessingAvatar, setIsProcessingAvatar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [cities, setCities] = useState<string[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const { user, signOut, isAuthenticated } = useAuth();
  const isLoadedRef = useRef(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Carrega dados iniciais
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
      let currentData: ProfilePreferences = defaultProfile;
      if (stored) {
        try {
          currentData = { ...defaultProfile, ...JSON.parse(stored) };
        } catch {
          // ignore
        }
      }

      // Processa telefone inicial
      const parsedInitial = parseStoredPhone(currentData.phone);
      let currentDdi = parsedInitial.ddi;
      currentData.phone = parsedInitial.formatted;

      try {
        const supabase = createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser && isMounted) {
          const { data: dbProfile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", authUser.id)
            .maybeSingle();

          const rawPhone = dbProfile?.phone || currentData.phone;
          const parsedDbPhone = parseStoredPhone(rawPhone);
          currentDdi = parsedDbPhone.ddi;

          const merged: ProfilePreferences = {
            ...currentData,
            name: dbProfile?.full_name || authUser.user_metadata?.full_name || currentData.name,
            username: dbProfile?.username || authUser.user_metadata?.username || currentData.username || "",
            avatarUrl: dbProfile?.avatar_url || authUser.user_metadata?.avatar_url || currentData.avatarUrl || null,
            email: authUser.email || currentData.email,
            phone: parsedDbPhone.formatted,
            birthDate: dbProfile?.birth_date || authUser.user_metadata?.birth_date || currentData.birthDate,
            gender: dbProfile?.gender || authUser.user_metadata?.gender || currentData.gender,
            role: dbProfile?.career_role || authUser.user_metadata?.role || currentData.role,
            company: dbProfile?.company || currentData.company,
            country: dbProfile?.country || currentData.country || "Brasil",
            state: dbProfile?.state || currentData.state || "SP",
            city: dbProfile?.city || currentData.city || "São Paulo",
            bio: dbProfile?.bio || currentData.bio,
            weeklyGoal: dbProfile?.weekly_goal ?? currentData.weeklyGoal ?? 4,
            lessonReminders: dbProfile?.lesson_reminders ?? currentData.lessonReminders ?? true,
            emailDigest: dbProfile?.email_digest ?? currentData.emailDigest ?? true,
            achievementAlerts: dbProfile?.achievement_alerts ?? currentData.achievementAlerts ?? false,
          };
          currentData = merged;
          localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(merged));
        }
      } catch {
        // Modo offline
      }

      if (isMounted) {
        setPhoneDdi(currentDdi);
        setSavedPhoneDdi(currentDdi);
        setProfile(currentData);
        setSavedProfile(currentData);
        isLoadedRef.current = true;
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Carrega cidades dinamicamente quando o país é Brasil e o estado muda
  useEffect(() => {
    if (profile.country === "Brasil" && profile.state) {
      let isMounted = true;
      setIsLoadingCities(true);
      getCitiesForState(profile.state).then((list) => {
        if (isMounted) {
          setCities(list);
          setIsLoadingCities(false);
          if (list.length > 0 && !list.includes(profile.city) && !profile.city) {
            setProfile((prev) => ({ ...prev, city: list[0] }));
          }
        }
      });
      return () => {
        isMounted = false;
      };
    } else {
      setCities([]);
    }
  }, [profile.country, profile.state, profile.city]);

  const hasChanges = JSON.stringify(profile) !== JSON.stringify(savedProfile) || phoneDdi !== savedPhoneDdi;

  const updateProfile = <Key extends keyof ProfilePreferences>(key: Key, value: ProfilePreferences[Key]) => {
    setProfile((current) => ({ ...current, [key]: value }));
  };

  /**
   * Salva as preferências de perfil no Supabase e no LocalStorage
   */
  const saveProfile = useCallback(
    async (
      profileToSave: ProfilePreferences,
      ddiToSave: string,
      isManualAction = false
    ) => {
      setIsSaving(true);
      setSaveStatus("saving");

      const sanitizedUsername = profileToSave.username
        ? profileToSave.username.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, "")
        : "";

      const fullPhoneToSave = profileToSave.phone ? composeFullPhone(ddiToSave, profileToSave.phone) : null;

      const cleanProfile: ProfilePreferences = {
        ...profileToSave,
        username: sanitizedUsername,
      };

      // Atualiza o localStorage e avisa o restante da UI
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(cleanProfile));
      setSavedProfile(cleanProfile);
      setSavedPhoneDdi(ddiToSave);
      window.dispatchEvent(new CustomEvent<ProfilePreferences>(PROFILE_SAVED_EVENT, { detail: cleanProfile }));

      try {
        const supabase = createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          const { error: dbError } = await supabase
            .from("profiles")
            .update({
              full_name: cleanProfile.name,
              username: sanitizedUsername || null,
              avatar_url: cleanProfile.avatarUrl || null,
              phone: fullPhoneToSave,
              birth_date: cleanProfile.birthDate || null,
              gender: cleanProfile.gender || null,
              career_role: cleanProfile.role || null,
              company: cleanProfile.company || null,
              country: cleanProfile.country || "Brasil",
              state: cleanProfile.state || null,
              city: cleanProfile.city || null,
              bio: cleanProfile.bio,
              weekly_goal: cleanProfile.weeklyGoal,
              lesson_reminders: cleanProfile.lessonReminders,
              email_digest: cleanProfile.emailDigest,
              achievement_alerts: cleanProfile.achievementAlerts,
              updated_at: new Date().toISOString(),
            })
            .eq("id", authUser.id);

          if (dbError) throw dbError;

          await supabase.auth.updateUser({
            data: {
              full_name: cleanProfile.name,
              username: sanitizedUsername || null,
              avatar_url: cleanProfile.avatarUrl || null,
              phone: fullPhoneToSave,
              birth_date: cleanProfile.birthDate,
              gender: cleanProfile.gender,
              career_role: cleanProfile.role,
            },
          });
        }

        setSaveStatus("saved");
        if (isManualAction) {
          toast.success("Perfil salvo com sucesso!", {
            description: "Todas as suas informações estão atualizadas.",
          });
        }
      } catch (err: any) {
        console.error("Erro ao salvar perfil:", err);
        setSaveStatus("error");
        if (isManualAction) {
          toast.danger("Erro ao salvar alterações", {
            description: err?.message || "Tente novamente mais tarde.",
          });
        }
      } finally {
        setIsSaving(false);
      }
    },
    []
  );

  // Efeito de auto-save com debounce de 800ms
  useEffect(() => {
    if (!isLoadedRef.current) return;

    const isProfileDifferent = JSON.stringify(profile) !== JSON.stringify(savedProfile);
    const isPhoneDdiDifferent = phoneDdi !== savedPhoneDdi;

    if (!isProfileDifferent && !isPhoneDdiDifferent) {
      return;
    }

    setSaveStatus("saving");

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      void saveProfile(profile, phoneDdi, false);
    }, 800);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [profile, phoneDdi, savedProfile, savedPhoneDdi, saveProfile]);

  /**
   * Recebe a URL já otimizada pelo ImageUpload (ou `null` na remoção) e cuida
   * apenas dos efeitos que o componente não conhece: tabela `profiles`, metadata
   * do auth, cache local e o evento que atualiza o avatar no restante da UI.
   */
  const handleAvatarChange = async (url: string | null) => {
    setIsProcessingAvatar(true);
    try {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (authUser) {
        await supabase
          .from("profiles")
          .update({
            avatar_url: url,
            updated_at: new Date().toISOString(),
          })
          .eq("id", authUser.id);

        await supabase.auth.updateUser({ data: { avatar_url: url } });
      }

      const updated: ProfilePreferences = { ...profile, avatarUrl: url };
      setProfile(updated);
      setSavedProfile(updated);
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent<ProfilePreferences>(PROFILE_SAVED_EVENT, { detail: updated }));

      if (!url) {
        toast.success("Foto de perfil removida.");
      }
    } catch (err: unknown) {
      console.error("Erro ao atualizar a foto de perfil:", err);
      toast.danger("Erro ao atualizar foto", {
        description: err instanceof Error ? err.message : "Não foi possível salvar a nova foto.",
      });
    } finally {
      setIsProcessingAvatar(false);
    }
  };

  const handleResetPassword = async () => {
    try {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const targetEmail = authUser?.email || profile.email;

      if (!targetEmail) {
        toast.danger("E-mail não informado", { description: "Informe seu e-mail para redefinir a senha." });
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
        redirectTo: `${window.location.origin}/acessar`,
      });

      if (error) throw error;

      toast.success("E-mail de redefinição enviado!", {
        description: `Enviamos as instruções para ${targetEmail}. Verifique sua caixa de entrada.`,
      });
    } catch (err: any) {
      toast.danger("Erro ao solicitar redefinição", { description: err?.message });
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    void saveProfile(profile, phoneDdi, true);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Seção 1: Foto de Perfil */}
      <section aria-labelledby="profile-photo-title">
        <Card className="border-hairline shadow-elev-1">
          <SectionHeader
            id="profile-photo-title"
            title="Foto de perfil"
            description="Personalize sua imagem de exibição na plataforma. Recomendamos uma foto nítida com boa iluminação."
            icon={Camera}
            tone="bg-accent-soft text-accent-soft-foreground"
          />

          <Card.Content className="pt-6">
            <ImageUpload
              label="Sua foto de identificação"
              value={profile.avatarUrl}
              onChange={(url) => void handleAvatarChange(url)}
              bucket="avatars"
              folder={user?.id ?? ""}
              aspect="square"
              allowUrl={false}
              isDisabled={!user || isProcessingAvatar}
              description="PNG, JPG ou WEBP. Prefira uma foto nítida, com boa iluminação e fundo neutro."
              previewClassName="size-24 rounded-2xl border-solid ring-4 ring-surface shadow-elev-2"
              fallback={
                <span className="font-display text-3xl font-extrabold text-muted">
                  {getInitials(profile.name)}
                </span>
              }
            />
          </Card.Content>
        </Card>
      </section>

      {/* Seção 2: Informações Pessoais & Localização */}
      <section aria-labelledby="personal-data-title">
        <Card className="border-hairline shadow-elev-1">
          <SectionHeader
            id="personal-data-title"
            title="Informações pessoais"
            description="Esses dados ajudam a personalizar conteúdos, certificados e comunicações."
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
              id="username"
              label="Nome de usuário (Username)"
              value={profile.username}
              placeholder="seu_usuario"
              description="Identificador único no sistema (ex: @mariana_costa)."
              autoComplete="username"
              onChange={(value) => {
                const sanitized = value.toLowerCase().replace(/[^a-z0-9_.-]/g, "");
                updateProfile("username", sanitized);
              }}
            />

            <ProfileField
              id="email"
              label="E-mail"
              type="email"
              value={profile.email}
              autoComplete="email"
              isRequired
              isDisabled={isAuthenticated}
              description={isAuthenticated ? "E-mail vinculado à sua conta autenticada." : undefined}
              onChange={(value) => updateProfile("email", value)}
            />

            {/* Telefone com DDI e formatação visual */}
            <PhoneInputField
              id="phone"
              name="phone"
              label="Telefone / WhatsApp"
              value={profile.phone}
              ddi={phoneDdi}
              onDdiChange={setPhoneDdi}
              onChange={(val) => updateProfile("phone", val)}
              placeholder="(00) 00000-0000"
              description="Informe com DDD. O código padrão é Brasil (+55)."
            />

            <ProfileField
              id="birthDate"
              label="Data de nascimento"
              type="date"
              value={profile.birthDate}
              autoComplete="bday"
              isRequired
              onChange={(value) => updateProfile("birthDate", value)}
            />

            <Select
              selectedKey={profile.gender || "Feminino"}
              onSelectionChange={(key) => updateProfile("gender", String(key))}
              className="w-full space-y-1.5"
            >
              <Label>Gênero</Label>
              <Select.Trigger className="w-full">
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {GENDER_OPTIONS.map((g) => (
                    <ListBoxItem key={g} id={g}>
                      {g}
                    </ListBoxItem>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>

            <Select
              selectedKey={profile.role || CAREER_ROLES[0]}
              onSelectionChange={(key) => updateProfile("role", String(key))}
              className="w-full space-y-1.5"
            >
              <Label>Cargo atual</Label>
              <Select.Trigger className="w-full">
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {CAREER_ROLES.map((r) => (
                    <ListBoxItem key={r} id={r}>
                      {r}
                    </ListBoxItem>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>

            <ProfileField
              id="company"
              label="Empresa"
              value={profile.company}
              autoComplete="organization"
              placeholder="Ex: Acme Corporation"
              onChange={(value) => updateProfile("company", value)}
            />

            {/* Seleção de País */}
            <Select
              selectedKey={profile.country || "Brasil"}
              onSelectionChange={(key) => {
                const country = String(key);
                updateProfile("country", country);
                if (country === "Brasil" && !profile.state) {
                  updateProfile("state", "SP");
                }
              }}
              className="w-full space-y-1.5"
            >
              <Label>País</Label>
              <Select.Trigger className="w-full">
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox className="max-h-60 overflow-y-auto">
                  {COUNTRIES.map((c) => (
                    <ListBoxItem key={c.name} id={c.name}>
                      {c.name}
                    </ListBoxItem>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>

            {/* Seleção de Estado / UF */}
            {profile.country === "Brasil" ? (
              <Select
                selectedKey={profile.state || "SP"}
                onSelectionChange={(key) => {
                  const uf = String(key);
                  updateProfile("state", uf);
                }}
                className="w-full space-y-1.5"
              >
                <Label>Estado (UF)</Label>
                <Select.Trigger className="w-full">
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox className="max-h-60 overflow-y-auto">
                    {BRAZILIAN_STATES.map((s) => (
                      <ListBoxItem key={s.uf} id={s.uf}>
                        {s.uf} - {s.name}
                      </ListBoxItem>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            ) : (
              <ProfileField
                id="state"
                label="Estado / Província"
                value={profile.state}
                placeholder="Ex: Califórnia"
                autoComplete="address-level1"
                onChange={(value) => updateProfile("state", value)}
              />
            )}

            {/* Seleção de Cidade */}
            {profile.country === "Brasil" && cities.length > 0 ? (
              <Select
                selectedKey={profile.city || cities[0] || ""}
                onSelectionChange={(key) => updateProfile("city", String(key))}
                className="w-full space-y-1.5"
              >
                <Label className="flex items-center justify-between">
                  <span>Cidade</span>
                  {isLoadingCities && <span className="text-xs font-normal text-muted">(carregando...)</span>}
                </Label>
                <Select.Trigger className="w-full">
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox className="max-h-60 overflow-y-auto">
                    {cities.map((city) => (
                      <ListBoxItem key={city} id={city}>
                        {city}
                      </ListBoxItem>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            ) : (
              <ProfileField
                id="city"
                label="Cidade"
                value={profile.city}
                placeholder={isLoadingCities ? "Carregando cidades..." : "Ex: São Paulo"}
                autoComplete="address-level2"
                onChange={(value) => updateProfile("city", value)}
              />
            )}

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

      {/* Seção 3: Ritmo de Aprendizagem */}
      <section aria-labelledby="learning-preferences-title">
        <Card className="border-hairline shadow-elev-1">
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

      {/* Seção 4: Notificações */}
      <section aria-labelledby="notifications-title">
        <Card className="border-hairline shadow-elev-1">
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

      {/* Seção 5: Conta, Segurança e Desconexão */}
      <section aria-labelledby="security-title">
        <Card className="border-hairline shadow-elev-1">
          <Card.Content className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
                  <p className="mt-1 text-sm leading-6 text-muted">
                    {user?.email ? `Conectado como ${user.email}` : "Gerencie seu acesso e sessão na plataforma."}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" onPress={handleResetPassword}>
                  <LockKeyhole className="size-4" aria-hidden="true" /> Redefinir senha
                </Button>

                {isAuthenticated && (
                  <Button
                    type="button"
                    variant="outline"
                    onPress={signOut}
                    className="text-danger hover:bg-danger-soft/20 border-danger/30"
                  >
                    <LogOut className="size-4" aria-hidden="true" /> Sair da conta
                  </Button>
                )}
              </div>
            </div>
          </Card.Content>
        </Card>
      </section>

      {/* Barra de Ações Persistente com Feedback de Salvamento Automático */}
      <div className="material-thick sticky bottom-4 z-10 flex flex-col gap-3 rounded-2xl p-3.5 sm:flex-row sm:items-center sm:justify-between shadow-elev-2">
        <div aria-live="polite" className="flex items-center gap-2 text-sm text-muted">
          {saveStatus === "saving" || isSaving ? (
            <span className="inline-flex items-center gap-2 font-medium text-muted">
              <Spinner size="sm" /> Salvando alterações...
            </span>
          ) : saveStatus === "error" ? (
            <span className="inline-flex items-center gap-2 font-medium text-danger">
              Não foi possível salvar as alterações. Tentaremos novamente em instantes.
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 font-semibold text-success">
              <CheckCircle2 className="size-4" aria-hidden="true" /> Todas as alterações estão salvas.
            </span>
          )}
        </div>
        <Button
          type="submit"
          variant={hasChanges ? "primary" : "outline"}
          isDisabled={!hasChanges && !isSaving}
        >
          {isSaving ? (
            <>
              <Spinner size="sm" /> Salvando...
            </>
          ) : (
            <>
              <Save className="size-4" aria-hidden="true" /> {hasChanges ? "Salvar agora" : "Salvo"}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
