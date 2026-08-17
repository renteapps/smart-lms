"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  BellRing,
  Camera,
  CheckCircle2,
  LockKeyhole,
  LogOut,
  Save,
  ShieldCheck,
  Target,
  Trash2,
  Upload,
  UserRound,
} from "lucide-react";
import {
  Avatar,
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
  compressAndConvertToWebP,
  deleteAvatarFromStorage,
  uploadAvatarToStorage,
} from "@/lib/imageOptimization";
import {
  BRAZILIAN_STATES,
  COUNTRIES,
  getCitiesForState,
} from "@/lib/locationData";
import { PhoneInputField } from "@/components/ui/PhoneInputField";
import { composeFullPhone, parseStoredPhone } from "@/lib/phoneUtils";

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
  const [saveState, setSaveState] = useState<"idle" | "saved">("idle");
  const [isProcessingAvatar, setIsProcessingAvatar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [cities, setCities] = useState<string[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, signOut, isAuthenticated } = useAuth();

  // Carrega dados do Supabase ou localStorage
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
      if (isMounted) {
        setPhoneDdi(parsedInitial.ddi);
        currentData.phone = parsedInitial.formatted;
      }

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

          setPhoneDdi(parsedDbPhone.ddi);

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
        setProfile(currentData);
        setSavedProfile(currentData);
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

  const hasChanges = JSON.stringify(profile) !== JSON.stringify(savedProfile);

  const updateProfile = <Key extends keyof ProfilePreferences>(key: Key, value: ProfilePreferences[Key]) => {
    setProfile((current) => ({ ...current, [key]: value }));
    setSaveState("idle");
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.danger("Formato inválido", { description: "Por favor, selecione um arquivo de imagem (PNG, JPG, WEBP)." });
      return;
    }

    setIsProcessingAvatar(true);
    try {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (authUser) {
        const oldAvatarUrl = profile.avatarUrl;

        // Converte para WebP com 70% de qualidade e sobe no bucket avatars
        const { publicUrl } = await uploadAvatarToStorage(supabase, authUser.id, file);

        // Se havia foto antiga no storage, deleta para poupar espaço
        if (oldAvatarUrl && oldAvatarUrl !== publicUrl) {
          await deleteAvatarFromStorage(supabase, oldAvatarUrl);
        }

        // Salva na tabela profiles
        await supabase
          .from("profiles")
          .update({
            avatar_url: publicUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("id", authUser.id);

        // Atualiza auth metadata
        await supabase.auth.updateUser({
          data: { avatar_url: publicUrl },
        });

        const updated: ProfilePreferences = { ...profile, avatarUrl: publicUrl };
        setProfile(updated);
        setSavedProfile(updated);
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent<ProfilePreferences>(PROFILE_SAVED_EVENT, { detail: updated }));

        toast.success("Foto de perfil atualizada!", {
          description: "Sua nova foto já está disponível na plataforma.",
        });
      } else {
        const webpFile = await compressAndConvertToWebP(file, { quality: 0.7 });
        const localPreviewUrl = URL.createObjectURL(webpFile);

        const updated: ProfilePreferences = { ...profile, avatarUrl: localPreviewUrl };
        setProfile(updated);
        setSavedProfile(updated);
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent<ProfilePreferences>(PROFILE_SAVED_EVENT, { detail: updated }));

        toast.success("Foto atualizada localmente!", {
          description: "Foto atualizada com sucesso.",
        });
      }
    } catch (err: any) {
      console.error("Erro no processamento da foto de perfil:", err);
      toast.danger("Erro ao atualizar foto", {
        description: err?.message || "Não foi possível processar ou enviar a imagem.",
      });
    } finally {
      setIsProcessingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveAvatar = async () => {
    if (!profile.avatarUrl) return;

    setIsProcessingAvatar(true);
    try {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (authUser) {
        await deleteAvatarFromStorage(supabase, profile.avatarUrl);

        await supabase
          .from("profiles")
          .update({
            avatar_url: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", authUser.id);

        await supabase.auth.updateUser({
          data: { avatar_url: null },
        });
      }

      const updated: ProfilePreferences = { ...profile, avatarUrl: null };
      setProfile(updated);
      setSavedProfile(updated);
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent<ProfilePreferences>(PROFILE_SAVED_EVENT, { detail: updated }));

      toast.success("Foto de perfil removida com sucesso.", {
        description: "O arquivo foi excluído do servidor para otimizar o armazenamento.",
      });
    } catch (err: any) {
      console.error("Erro ao remover foto de perfil:", err);
      toast.danger("Erro ao remover foto", {
        description: err?.message || "Falha ao excluir o arquivo.",
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);

    const sanitizedUsername = profile.username
      ? profile.username.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, "")
      : "";

    const fullPhoneToSave = profile.phone ? composeFullPhone(phoneDdi, profile.phone) : null;

    const cleanProfile: ProfilePreferences = {
      ...profile,
      username: sanitizedUsername,
    };

    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(cleanProfile));
    setSavedProfile(cleanProfile);
    setSaveState("saved");
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

        toast.success("Perfil atualizado com sucesso!", {
          description: "Todas as suas informações foram salvas.",
        });
      } else {
        toast.success("Perfil salvo localmente!");
      }
    } catch (err: any) {
      console.error("Erro ao salvar perfil no Supabase:", err);
      toast.danger("Erro ao sincronizar com o banco", { description: err?.message || "Tente novamente mais tarde." });
    } finally {
      setIsSaving(false);
    }
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
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              {/* Avatar Preview */}
              <div className="relative group shrink-0">
                <Avatar
                  size="lg"
                  color="accent"
                  className="size-24 rounded-2xl ring-4 ring-surface shadow-elev-2 overflow-hidden"
                >
                  {profile.avatarUrl ? (
                    <Avatar.Image
                      src={profile.avatarUrl}
                      alt={profile.name}
                      className="size-full object-cover"
                    />
                  ) : null}
                  <Avatar.Fallback className="font-display text-3xl font-extrabold">
                    {getInitials(profile.name)}
                  </Avatar.Fallback>
                </Avatar>

                {isProcessingAvatar && (
                  <div className="absolute inset-0 bg-background/80 backdrop-blur-xs rounded-2xl flex items-center justify-center">
                    <Spinner size="sm" color="accent" />
                  </div>
                )}
              </div>

              {/* Controles de Foto */}
              <div className="flex-1 space-y-3">
                <div>
                  <h4 className="font-display text-base font-bold text-foreground">
                    Sua foto de identificação
                  </h4>
                  <p className="text-xs text-muted mt-1 leading-relaxed">
                    Formatos aceitos: PNG, JPG ou WEBP. Recomendamos uma foto com boa iluminação e fundo neutro.
                  </p>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarFileChange}
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                  className="sr-only"
                  aria-label="Upload de foto de perfil"
                  disabled={isProcessingAvatar}
                />

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    isDisabled={isProcessingAvatar}
                    onPress={() => fileInputRef.current?.click()}
                  >
                    {isProcessingAvatar ? (
                      <>
                        <Spinner size="sm" /> Otimizando...
                      </>
                    ) : profile.avatarUrl ? (
                      <>
                        <Upload className="size-3.5" aria-hidden="true" /> Alterar foto
                      </>
                    ) : (
                      <>
                        <Upload className="size-3.5" aria-hidden="true" /> Enviar foto
                      </>
                    )}
                  </Button>

                  {profile.avatarUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      isDisabled={isProcessingAvatar}
                      onPress={handleRemoveAvatar}
                      className="text-danger hover:bg-danger-soft/20 border-danger/30"
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" /> Remover foto
                    </Button>
                  )}
                </div>
              </div>
            </div>
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

      {/* Barra de Ações Persistente */}
      <div className="material-thick sticky bottom-4 z-10 flex flex-col gap-3 rounded-2xl p-3.5 sm:flex-row sm:items-center sm:justify-between shadow-elev-2">
        <p aria-live="polite" className="min-h-5 text-sm text-muted">
          {saveState === "saved" ? (
            <span className="inline-flex items-center gap-2 font-semibold text-success">
              <CheckCircle2 className="size-4" aria-hidden="true" /> Tudo certo! Seu perfil está atualizado. ✓
            </span>
          ) : hasChanges ? (
            "Você tem alterações ainda não salvas."
          ) : (
            "Seus dados estão atualizados no Supabase."
          )}
        </p>
        <Button type="submit" variant="primary" isDisabled={!hasChanges || isSaving}>
          {isSaving ? (
            <>
              <Spinner size="sm" /> Salvando...
            </>
          ) : (
            <>
              <Save className="size-4" aria-hidden="true" /> Salvar alterações
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
