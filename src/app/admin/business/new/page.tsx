"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CompanyForm } from "@/components/admin/business/CompanyForm";
import { getCompanyById } from "@/lib/data/business";
import { getCatalogCourses } from "@/lib/data/courses";
import { createClient } from "@/lib/supabase/client";
import { CatalogCourse } from "@/types/course";

function BusinessNewContent() {
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const [initialCompany, setInitialCompany] = React.useState<any>(null);
  const [availableCourses, setAvailableCourses] = React.useState<CatalogCourse[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function load() {
      const db = createClient();
      if (editId) {
        const found = await getCompanyById(db, editId);
        setInitialCompany(found);
      }
      const courses = await getCatalogCourses(db);
      setAvailableCourses(courses);
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
      availableCourses={availableCourses}
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
