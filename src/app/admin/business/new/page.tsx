"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CompanyForm } from "@/components/admin/business/CompanyForm";
import { getCompanyById } from "@/lib/data/business";
import { createClient } from "@/lib/supabase/client";

function BusinessNewContent() {
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const [initialCompany, setInitialCompany] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(!!editId);

  React.useEffect(() => {
    async function load() {
      if (editId) {
        const db = createClient();
        const found = await getCompanyById(db, editId);
        setInitialCompany(found);
      }
      setLoading(false);
    }
    load();
  }, [editId]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <CompanyForm
      initialCompany={initialCompany}
      mode={initialCompany ? "edit" : "create"}
    />
  );
}

export default function AdminBusinessNewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="size-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      }
    >
      <BusinessNewContent />
    </Suspense>
  );
}
