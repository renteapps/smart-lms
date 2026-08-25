"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Calendar, User } from "lucide-react";
import {
  Alert,
  Button,
  FieldError,
  InputGroup,
  Label,
  ListBox,
  ListBoxItem,
  Select,
  Spinner,
  TextField,
} from "@heroui/react";
import { AuthLayoutShell } from "@/components/auth/AuthLayoutShell";
import { PhoneInputField } from "@/components/ui/PhoneInputField";
import { CAREER_ROLES, GENDER_OPTIONS } from "@/lib/profilePreferences";
import { composeFullPhone, parseStoredPhone } from "@/lib/phoneUtils";
import { createClient } from "@/lib/supabase/client";
import { completeRequiredProfile } from "@/app/actions/profile";

type Initial = {
  fullName: string;
  username: string;
  phone: string;
  birthDate: string;
  gender: string;
  careerRole: string;
};

/**
 * O mesmo conjunto de campos de /criar-conta, sem senha e sem e-mail — a
 * conta já existe, só faltam os dados que a Eduzz/Hotmart não mandam. Ver
 * lib/profileCompleteness.ts para o porquê desses seis campos.
 */
export function CompleteProfileForm({ initial, next }: { initial: Initial; next: string }) {
  const parsedPhone = parseStoredPhone(initial.phone);

  const [fullName, setFullName] = useState(initial.fullName);
  const [username, setUsername] = useState(initial.username);
  const [phone, setPhone] = useState(parsedPhone.formatted);
  const [phoneDdi, setPhoneDdi] = useState(parsedPhone.ddi);
  const [birthDate, setBirthDate] = useState(initial.birthDate);
  const [gender, setGender] = useState(initial.gender || GENDER_OPTIONS[0]);
  const [role, setRole] = useState(initial.careerRole || CAREER_ROLES[0]);

  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Mesma checagem de disponibilidade de /criar-conta, ignorando o próprio
  // username atual (senão ele sempre bateria "em uso" contra si mesmo).
  useEffect(() => {
    // As duas ramificações só mexem em estado dentro do timer, nunca direto
    // no corpo do effect — evita o disparo de renders em cascata que o React
    // sinaliza quando setState roda de forma síncrona dentro de um effect.
    const timer = setTimeout(async () => {
      if (!username.trim() || username.length < 3 || username === initial.username) {
        setUsernameError(null);
        return;
      }

      setIsCheckingUsername(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("profiles")
          .select("username")
          .eq("username", username.trim())
          .maybeSingle();

        setUsernameError(!error && data ? "Este nome de usuário já está em uso." : null);
      } finally {
        setIsCheckingUsername(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [username, initial.username]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);

    if (!fullName.trim() || !username.trim() || !phone.trim() || !birthDate || !gender || !role) {
      setErrorMessage("Preencha todos os campos para continuar.");
      return;
    }
    if (usernameError) {
      setErrorMessage("Corrija o nome de usuário antes de continuar.");
      return;
    }

    setIsSaving(true);
    const result = await completeRequiredProfile({
      fullName: fullName.trim(),
      username: username.trim(),
      phone: composeFullPhone(phoneDdi, phone),
      birthDate,
      gender,
      careerRole: role,
    });
    setIsSaving(false);

    if (!result.success) {
      setErrorMessage(result.message ?? "Não foi possível salvar. Tente novamente.");
      return;
    }

    // Faz o middleware reavaliar a rota de destino com o perfil já completo,
    // em vez de um router.push que reaproveitaria o RSC em cache.
    window.location.assign(next);
  }

  return (
    <AuthLayoutShell
      eyebrow="Falta pouco"
      title="Complete seu cadastro"
      subtitle="Alguns dados não vêm da sua compra — preencha para liberar sua conta."
      sideTitle="Sua conta já foi criada."
      sideDescription="Falta só personalizar sua experiência antes de começar a estudar."
    >
      {errorMessage && (
        <Alert color="danger" className="mb-4">
          <Alert.Indicator>
            <AlertCircle className="size-4" aria-hidden="true" />
          </Alert.Indicator>
          <Alert.Content>
            <Alert.Title>Atenção</Alert.Title>
            <Alert.Description>{errorMessage}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField isRequired fullWidth className="w-full space-y-1.5">
          <Label htmlFor="fullName" className="text-sm font-medium text-foreground">
            Nome completo
          </Label>
          <InputGroup fullWidth className="w-full">
            <InputGroup.Prefix className="text-muted pl-3">
              <User className="size-4" aria-hidden="true" />
            </InputGroup.Prefix>
            <InputGroup.Input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFullName(e.target.value)}
              className="w-full text-sm"
              required
            />
          </InputGroup>
          <FieldError />
        </TextField>

        <TextField isRequired fullWidth className="w-full space-y-1.5" isInvalid={!!usernameError}>
          <Label htmlFor="username" className="text-sm font-medium text-foreground">
            Nome de usuário
          </Label>
          <InputGroup fullWidth className="w-full">
            <InputGroup.Prefix className="text-muted pl-3">
              <span className="text-muted">@</span>
            </InputGroup.Prefix>
            <InputGroup.Input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ""))
              }
              className="w-full text-sm"
              required
            />
            {isCheckingUsername && (
              <InputGroup.Suffix className="pr-3">
                <Spinner size="sm" />
              </InputGroup.Suffix>
            )}
          </InputGroup>
          {usernameError ? (
            <p className="text-xs font-semibold text-danger">{usernameError}</p>
          ) : (
            <FieldError />
          )}
        </TextField>

        <PhoneInputField
          id="phone"
          name="phone"
          label="Telefone / WhatsApp"
          value={phone}
          ddi={phoneDdi}
          onDdiChange={setPhoneDdi}
          onChange={setPhone}
          placeholder="(00) 00000-0000"
          isRequired
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField isRequired fullWidth className="w-full space-y-1.5">
            <Label htmlFor="birthDate" className="text-sm font-medium text-foreground">
              Data de nascimento
            </Label>
            <InputGroup fullWidth className="w-full">
              <InputGroup.Prefix className="text-muted pl-3">
                <Calendar className="size-4" aria-hidden="true" />
              </InputGroup.Prefix>
              <InputGroup.Input
                id="birthDate"
                name="birthDate"
                type="date"
                autoComplete="bday"
                value={birthDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBirthDate(e.target.value)}
                className="w-full text-sm"
                required
              />
            </InputGroup>
            <FieldError />
          </TextField>

          <Select selectedKey={gender} onSelectionChange={(key) => setGender(String(key))} className="w-full space-y-1.5" isRequired>
            <Label className="text-sm font-medium text-foreground">Gênero</Label>
            <Select.Trigger className="w-full">
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {GENDER_OPTIONS.map((g) => (
                  <ListBoxItem key={g} id={g}>{g}</ListBoxItem>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        </div>

        <Select selectedKey={role} onSelectionChange={(key) => setRole(String(key))} className="w-full space-y-1.5" isRequired>
          <Label className="text-sm font-medium text-foreground">Cargo / Momento de carreira</Label>
          <Select.Trigger className="w-full">
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {CAREER_ROLES.map((r) => (
                <ListBoxItem key={r} id={r}>{r}</ListBoxItem>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>

        <Button type="submit" variant="primary" fullWidth isDisabled={isSaving || isCheckingUsername}>
          {isSaving ? "Salvando..." : "Continuar"}
        </Button>
      </form>
    </AuthLayoutShell>
  );
}
