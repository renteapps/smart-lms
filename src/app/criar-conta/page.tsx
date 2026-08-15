"use client";

import React, { Suspense, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowRight, Briefcase, Calendar, Mail, User } from "lucide-react";
import {
  Alert,
  Button,
  Checkbox,
  FieldError,
  InputGroup,
  Label,
  ListBox,
  ListBoxItem,
  Select,
  Spinner,
  TextField,
  toast,
} from "@heroui/react";
import { AuthLayoutShell } from "@/components/auth/AuthLayoutShell";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { PasswordStrengthIndicator } from "@/components/auth/PasswordStrengthIndicator";
import { CAREER_ROLES, GENDER_OPTIONS } from "@/components/profile/ProfileEditor";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

function CriarContaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("redirect") || searchParams.get("next") || "/onboarding";
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthLoading, isAuthenticated, router]);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<string>("Feminino");
  const [role, setRole] = useState<string>(CAREER_ROLES[0]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!fullName.trim() || !email.trim() || !password) {
      setErrorMessage("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    if (!birthDate) {
      setErrorMessage("Por favor, informe sua data de nascimento.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("A senha deve conter no mínimo 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("As senhas digitadas não coincidem.");
      return;
    }

    if (!agreeTerms) {
      setErrorMessage("Você precisa aceitar os Termos de Uso e Política de Privacidade para prosseguir.");
      return;
    }

    startTransition(async () => {
      try {
        const supabase = createClient();
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const emailRedirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              birth_date: birthDate || null,
              gender: gender || null,
              role: role || null,
            },
            emailRedirectTo,
          },
        });

        if (error) {
          let message = error.message;
          if (error.message.includes("User already registered")) {
            message = "Este endereço de e-mail já possui uma conta ativa. Faça login para continuar.";
          } else if (
            error.message.includes("email rate limit exceeded") ||
            error.message.toLowerCase().includes("rate limit")
          ) {
            message = "Muitas mensagens de e-mail foram solicitadas recentemente. Por favor, verifique sua caixa de entrada e spam ou aguarde alguns minutos.";
          }
          setErrorMessage(message);
          return;
        }

        // Se a confirmação de e-mail estiver desativada no Supabase, a sessão já é retornada ativa!
        if (data.session) {
          toast.success("Conta criada com sucesso!", {
            description: "Seja muito bem-vindo ao Smart LMS!",
          });
          window.location.href = next;
        } else {
          // Se ainda exigir validação por e-mail:
          toast.success("Conta criada!", {
            description: "Enviamos uma mensagem de confirmação para seu e-mail.",
          });
          router.push(`/confirmar?email=${encodeURIComponent(email.trim())}&next=${encodeURIComponent(next)}`);
        }
      } catch (err: any) {
        setErrorMessage(err?.message || "Ocorreu um erro ao processar seu cadastro.");
      }
    });
  };

  return (
    <AuthLayoutShell
      title="Crie sua conta"
      subtitle="Inicie sua jornada de aprendizagem prática com trilhas personalizadas e mentoria por IA."
      eyebrow="Novo cadastro"
      footerText="Já tem uma conta no Smart LMS?"
      footerLinkText="Acessar conta"
      footerLinkHref="/acessar"
      sideTitle="Acelere sua carreira com método comprovado."
      sideDescription="Junte-se a milhares de profissionais que transformam teoria em execução no trabalho com o Smart LMS."
      sideBadge="Cadastro Gratuito"
    >
      {/* Error alert */}
      {errorMessage && (
        <Alert status="danger" className="mb-6">
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
        {/* Full Name */}
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
              placeholder="Ex.: Carolina Mendes"
              value={fullName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFullName(e.target.value)}
              className="w-full text-sm"
              required
            />
          </InputGroup>
          <FieldError />
        </TextField>

        {/* Email */}
        <TextField isRequired fullWidth className="w-full space-y-1.5">
          <Label htmlFor="email" className="text-sm font-medium text-foreground">
            E-mail corporativo ou pessoal
          </Label>
          <InputGroup fullWidth className="w-full">
            <InputGroup.Prefix className="text-muted pl-3">
              <Mail className="size-4" aria-hidden="true" />
            </InputGroup.Prefix>
            <InputGroup.Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="carolina.mendes@empresa.com"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              className="w-full text-sm"
              required
            />
          </InputGroup>
          <FieldError />
        </TextField>

        {/* Birth Date & Gender (2 cols) */}
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

          <Select
            selectedKey={gender}
            onSelectionChange={(key) => setGender(String(key))}
            className="w-full space-y-1.5"
            isRequired
          >
            <Label className="text-sm font-medium text-foreground">Gênero</Label>
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
        </div>

        {/* Role (Cargo) */}
        <Select
          selectedKey={role}
          onSelectionChange={(key) => setRole(String(key))}
          className="w-full space-y-1.5"
          isRequired
        >
          <Label className="text-sm font-medium text-foreground">Cargo / Momento de carreira</Label>
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

        {/* Password */}
        <div>
          <PasswordInput
            id="password"
            name="password"
            label="Senha de acesso"
            placeholder="Crie uma senha forte"
            value={password}
            onChange={setPassword}
            isRequired
            autoComplete="new-password"
          />
          <PasswordStrengthIndicator password={password} />
        </div>

        {/* Confirm Password */}
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          label="Confirmação da senha"
          placeholder="Repita a senha criada"
          value={confirmPassword}
          onChange={setConfirmPassword}
          isRequired
          autoComplete="new-password"
          isInvalid={!!password && !!confirmPassword && password !== confirmPassword}
          errorMessage={
            password && confirmPassword && password !== confirmPassword
              ? "As senhas informadas não conferem."
              : undefined
          }
        />

        {/* Terms and Privacy Policy */}
        <div className="pt-2">
          <Checkbox
            isSelected={agreeTerms}
            onChange={setAgreeTerms}
            className="flex flex-row items-start gap-2.5 cursor-pointer"
          >
            <Checkbox.Content className="flex items-start gap-2.5">
              <Checkbox.Control className="mt-0.5">
                <Checkbox.Indicator />
              </Checkbox.Control>
              <Label className="text-xs text-muted leading-relaxed cursor-pointer font-normal">
                Declaro que li e concordo com os{" "}
                <Link href="/termos" className="text-accent hover:underline font-semibold" target="_blank">
                  Termos de Uso
                </Link>{" "}
                e a{" "}
                <Link href="/privacidade" className="text-accent hover:underline font-semibold" target="_blank">
                  Política de Privacidade
                </Link>
                .
              </Label>
            </Checkbox.Content>
          </Checkbox>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          isDisabled={isPending}
          className="mt-6 h-11 font-semibold text-sm rounded-xl"
        >
          {isPending ? (
            <>
              <Spinner size="sm" className="mr-2" />
              <span>Criando sua conta...</span>
            </>
          ) : (
            <>
              <span>Finalizar cadastro</span>
              <ArrowRight className="size-4 ml-1.5" aria-hidden="true" />
            </>
          )}
        </Button>
      </form>
    </AuthLayoutShell>
  );
}

export default function CriarContaPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] grid place-items-center">
          <Spinner size="lg" />
        </div>
      }
    >
      <CriarContaContent />
    </Suspense>
  );
}
