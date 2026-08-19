"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, UserRound, MapPin, Briefcase } from "lucide-react";
import {
  Button,
  Card,
  Input,
  Label,
  ListBox,
  ListBoxItem,
  Select,
  TextField,
  buttonVariants,
} from "@heroui/react";
import { PageHeader } from "@/components/ui/editorial";
import type { UserProfile } from "@/lib/data/profiles";
import { updateUserProfile } from "./actions";

const estados = [
  { id: "AC", label: "Acre" },
  { id: "AL", label: "Alagoas" },
  { id: "AP", label: "Amapá" },
  { id: "AM", label: "Amazonas" },
  { id: "BA", label: "Bahia" },
  { id: "CE", label: "Ceará" },
  { id: "DF", label: "Distrito Federal" },
  { id: "ES", label: "Espírito Santo" },
  { id: "GO", label: "Goiás" },
  { id: "MA", label: "Maranhão" },
  { id: "MT", label: "Mato Grosso" },
  { id: "MS", label: "Mato Grosso do Sul" },
  { id: "MG", label: "Minas Gerais" },
  { id: "PA", label: "Pará" },
  { id: "PB", label: "Paraíba" },
  { id: "PR", label: "Paraná" },
  { id: "PE", label: "Pernambuco" },
  { id: "PI", label: "Piauí" },
  { id: "RJ", label: "Rio de Janeiro" },
  { id: "RN", label: "Rio Grande do Norte" },
  { id: "RS", label: "Rio Grande do Sul" },
  { id: "RO", label: "Rondônia" },
  { id: "RR", label: "Roraima" },
  { id: "SC", label: "Santa Catarina" },
  { id: "SP", label: "São Paulo" },
  { id: "SE", label: "Sergipe" },
  { id: "TO", label: "Tocantins" }
];

export default function EditUserForm({ profile }: { profile: UserProfile }) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    
    const formData = new FormData(e.currentTarget);
    const result = await updateUserProfile(profile.id, {
      fullName: formData.get("fullName") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      birthDate: formData.get("birthDate") as string,
      company: formData.get("company") as string,
      careerRole: formData.get("careerRole") as string,
      department: formData.get("department") as string,
      zipCode: formData.get("zipCode") as string,
      address: formData.get("address") as string,
      addressNumber: formData.get("addressNumber") as string,
      neighborhood: formData.get("neighborhood") as string,
      city: formData.get("city") as string,
      state: formData.get("state") as string,
    });
    
    if (result.error) {
      setError(result.error);
      setIsSaving(false);
    } else {
      router.push(`/admin/users/${profile.id}`);
      router.refresh();
    }
  };

  const prefs = (profile.preferences || {}) as Record<string, string>;

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-5xl space-y-8 pb-16">
      <div>
        <Link
          href={`/admin/users/${profile.id}`}
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-accent"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Voltar para o Perfil
        </Link>
        <PageHeader
          eyebrow="Perfil"
          title="Editar Perfil"
          description="Atualize as informações pessoais e profissionais do usuário."
          actions={
            <>
              <Link href={`/admin/users/${profile.id}`} className={buttonVariants({ variant: "tertiary" })}>
                Cancelar
              </Link>
              <Button type="submit" variant="primary" className="gap-2" isDisabled={isSaving}>
                <Save className="size-4" aria-hidden="true" />
                {isSaving ? "Salvando..." : "Salvar"}
              </Button>
            </>
          }
        />
        {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <Card.Header>
              <Card.Title className="flex items-center gap-2">
                <UserRound className="size-5 text-accent" aria-hidden="true" />
                Informações Pessoais
              </Card.Title>
            </Card.Header>
            <Card.Content className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <TextField defaultValue={profile.fullName || ""} name="fullName">
                  <Label>Nome Completo</Label>
                  <Input />
                </TextField>
                <TextField defaultValue={profile.email || ""} type="email" name="email">
                  <Label>E-mail</Label>
                  <Input />
                </TextField>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <TextField defaultValue={profile.phone || ""} type="tel" name="phone">
                  <Label>Telefone</Label>
                  <Input />
                </TextField>
                <TextField defaultValue={profile.birthDate || ""} name="birthDate">
                  <Label>Data de Nascimento</Label>
                  <Input type="date" />
                </TextField>
              </div>
            </Card.Content>
          </Card>

          <Card>
            <Card.Header>
              <Card.Title className="flex items-center gap-2">
                <MapPin className="size-5 text-accent" aria-hidden="true" />
                Endereço
              </Card.Title>
            </Card.Header>
            <Card.Content className="space-y-4">
              <TextField defaultValue={prefs.zipCode || ""} className="md:max-w-[16rem]" name="zipCode">
                <Label>CEP</Label>
                <Input />
              </TextField>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <TextField defaultValue={prefs.address || ""} className="md:col-span-2" name="address">
                  <Label>Logradouro</Label>
                  <Input />
                </TextField>
                <TextField defaultValue={prefs.addressNumber || ""} name="addressNumber">
                  <Label>Número</Label>
                  <Input />
                </TextField>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <TextField defaultValue={prefs.neighborhood || ""} name="neighborhood">
                  <Label>Bairro</Label>
                  <Input />
                </TextField>
                <TextField defaultValue={profile.city || ""} name="city">
                  <Label>Cidade</Label>
                  <Input />
                </TextField>
                <Select defaultSelectedKey={profile.state || ""} name="state">
                  <Label>Estado</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {estados.map((estado) => (
                        <ListBoxItem key={estado.id} id={estado.id}>
                          {estado.label}
                        </ListBoxItem>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
              </div>
            </Card.Content>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <Card.Header>
              <Card.Title className="flex items-center gap-2">
                <Briefcase className="size-5 text-accent" aria-hidden="true" />
                Profissional
              </Card.Title>
            </Card.Header>
            <Card.Content className="space-y-4">
              <TextField defaultValue={profile.company || prefs.company || ""} name="company">
                <Label>Empresa</Label>
                <Input />
              </TextField>
              <TextField defaultValue={profile.careerRole || ""} name="careerRole">
                <Label>Cargo</Label>
                <Input />
              </TextField>
              <TextField defaultValue={prefs.department || ""} name="department">
                <Label>Departamento</Label>
                <Input />
              </TextField>
            </Card.Content>
          </Card>
        </div>
      </div>
    </form>
  );
}
