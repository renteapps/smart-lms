"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Label, SearchField } from "@heroui/react";

export function CourseSearch({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);

  const submit = (next: string) => {
    router.push(next.trim() ? `/admin/cursos?q=${encodeURIComponent(next.trim())}` : "/admin/cursos");
  };

  return (
    <SearchField
      value={value}
      onChange={setValue}
      onSubmit={() => submit(value)}
      onClear={() => submit("")}
      className="w-full sm:max-w-md"
      aria-label="Buscar curso"
    >
      <Label className="sr-only">Buscar curso</Label>
      <SearchField.Group>
        <SearchField.SearchIcon />
        <SearchField.Input
          placeholder="Buscar curso..."
          onKeyDown={(e) => {
            if (e.key === "Enter") submit(value);
          }}
        />
        <SearchField.ClearButton />
      </SearchField.Group>
    </SearchField>
  );
}
