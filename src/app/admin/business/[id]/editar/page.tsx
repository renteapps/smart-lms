"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CompanyForm } from "@/components/admin/business/CompanyForm";
import { getCompanyById } from "@/lib/data/business";
import { getCatalogCourses } from "@/lib/data/courses";
import { createClient } from "@/lib/supabase/client";
import { Company } from "@/types/business";
import { CatalogCourse } from "@/types/course";
import { Button } from "@heroui/react";
import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";

export default function AdminBusinessEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [company, setCompany] = useState<Company | null>(null);
  const [availableCourses, setAvailableCourses] = useState<CatalogCourse[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      const db = createClient();
      if (id) {
        const found = await getCompanyById(db, id);
        setCompany(found);
      }
      const courses = await getCatalogCourses(db);
      setAvailableCourses(courses);
      setLoaded(true);
    }
    load();
  }, [id]);

  if (!loaded) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="grid size-12 place-items-center rounded-2xl bg-surface-secondary text-muted">
          <Building2 className="size-6" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Empresa não encontrada</h2>
        <p className="text-sm text-muted max-w-md">
          A empresa com identificador #{id} não foi localizada no cadastro corporativo.
        </p>
        <Link
          href="/admin/business"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-xs font-semibold text-foreground hover:bg-surface-secondary"
        >
          <ArrowLeft className="size-4" /> Voltar para Empresas
        </Link>
      </div>
    );
  }

  return <CompanyForm initialCompany={company} mode="edit" availableCourses={availableCourses} />;
}
