"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
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

const estados = [
  { id: "SP", label: "São Paulo" },
  { id: "RJ", label: "Rio de Janeiro" },
  { id: "MG", label: "Minas Gerais" },
];

export default function AdminUserEditarPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-16">
      <div>
        <Link
          href={`/admin/users/${id}`}
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
              <Link href={`/admin/users/${id}`} className={buttonVariants({ variant: "tertiary" })}>
                Cancelar
              </Link>
              <Button variant="primary" className="gap-2">
                <Save className="size-4" aria-hidden="true" />
                Salvar
              </Button>
            </>
          }
        />
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
                <TextField defaultValue="João Silva">
                  <Label>Nome Completo</Label>
                  <Input />
                </TextField>
                <TextField defaultValue="joao@email.com" type="email">
                  <Label>E-mail</Label>
                  <Input />
                </TextField>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <TextField defaultValue="(11) 98765-4321" type="tel">
                  <Label>Telefone</Label>
                  <Input />
                </TextField>
                <TextField defaultValue="1990-05-15">
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
              <TextField defaultValue="01001-000" className="md:max-w-[16rem]">
                <Label>CEP</Label>
                <Input />
              </TextField>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <TextField defaultValue="Praça da Sé" className="md:col-span-2">
                  <Label>Logradouro</Label>
                  <Input />
                </TextField>
                <TextField defaultValue="123">
                  <Label>Número</Label>
                  <Input />
                </TextField>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <TextField defaultValue="Sé">
                  <Label>Bairro</Label>
                  <Input />
                </TextField>
                <TextField defaultValue="São Paulo">
                  <Label>Cidade</Label>
                  <Input />
                </TextField>
                <Select defaultSelectedKey="SP">
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
              <TextField defaultValue="Smart Corp">
                <Label>Empresa</Label>
                <Input />
              </TextField>
              <TextField defaultValue="Desenvolvedor">
                <Label>Cargo</Label>
                <Input />
              </TextField>
              <TextField defaultValue="Tecnologia">
                <Label>Departamento</Label>
                <Input />
              </TextField>
            </Card.Content>
          </Card>
        </div>
      </div>
    </div>
  );
}
