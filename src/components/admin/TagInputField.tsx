"use client";

import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";

interface TagInputFieldProps {
  label: string;
  hint?: string;
  placeholder?: string;
  values: string[];
  onChange: (values: string[]) => void;
}

/** Campo de tags livres (Enter ou vírgula adiciona, X remove) — usado nos metadados pedagógicos da aula. */
export default function TagInputField({ label, hint, placeholder, values, onChange }: TagInputFieldProps) {
  const [draft, setDraft] = useState("");

  const commitDraft = () => {
    const value = draft.trim();
    if (value && !values.includes(value)) {
      onChange([...values, value]);
    }
    setDraft("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commitDraft();
    } else if (e.key === "Backspace" && draft === "" && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">{label}</label>
      {hint && <p className="text-xs text-muted">{hint}</p>}
      <div className="flex w-full flex-wrap items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 focus-within:border-accent">
        {values.map((tag) => (
          <span key={tag} className="flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent-soft-foreground">
            {tag}
            <button
              type="button"
              aria-label={`Remover ${tag}`}
              onClick={() => onChange(values.filter((v) => v !== tag))}
              className="rounded-full hover:opacity-70"
            >
              <X className="size-3" aria-hidden="true" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commitDraft}
          placeholder={values.length === 0 ? placeholder : ""}
          className="min-w-[8ch] flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
        />
      </div>
    </div>
  );
}
