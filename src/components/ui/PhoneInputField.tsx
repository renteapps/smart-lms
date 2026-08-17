"use client";

import React, { useId } from "react";
import { Phone } from "lucide-react";
import {
  Description,
  FieldError,
  Input,
  Label,
  ListBox,
  ListBoxItem,
  Select,
} from "@heroui/react";
import {
  DDI_OPTIONS,
  formatPhoneNumberByDdi,
} from "@/lib/phoneUtils";

export interface PhoneInputFieldProps {
  id?: string;
  name?: string;
  label?: string;
  value: string;
  ddi?: string;
  onDdiChange?: (ddi: string) => void;
  onChange: (value: string) => void;
  isRequired?: boolean;
  isDisabled?: boolean;
  description?: string;
  placeholder?: string;
  autoComplete?: string;
  className?: string;
}

export function PhoneInputField({
  id: customId,
  name = "phone",
  label = "Telefone / WhatsApp",
  value,
  ddi = "+55",
  onDdiChange,
  onChange,
  isRequired = false,
  isDisabled = false,
  description,
  placeholder,
  autoComplete = "tel-national",
  className = "w-full space-y-1.5",
}: PhoneInputFieldProps) {
  const generatedId = useId();
  const fieldId = customId || generatedId;

  const currentDdiOption = DDI_OPTIONS.find((opt) => opt.ddi === ddi) || DDI_OPTIONS[0];
  const dynamicPlaceholder = placeholder || currentDdiOption.placeholder || "(00) 00000-0000";

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const formatted = formatPhoneNumberByDdi(raw, ddi);
    onChange(formatted);
  };

  const handleDdiChange = (key: string | number | null) => {
    if (!key) return;
    const newDdi = String(key);
    if (onDdiChange) {
      onDdiChange(newDdi);
    }
    // Re-formata o número com as regras do novo DDI
    const reformatted = formatPhoneNumberByDdi(value, newDdi);
    onChange(reformatted);
  };

  return (
    <div className={className}>
      {label && (
        <Label htmlFor={fieldId} className="block text-sm font-medium text-foreground">
          {label} {isRequired && <span className="text-danger">*</span>}
        </Label>
      )}

      <div className="flex items-center gap-2">
        {/* Seletor de DDI */}
        <div className="w-[125px] sm:w-[135px] shrink-0">
          <Select
            selectedKey={ddi}
            onSelectionChange={handleDdiChange}
            aria-label="Código do País (DDI)"
            isDisabled={isDisabled}
            className="w-full"
          >
            <Select.Trigger className="w-full h-10 px-2.5 text-xs font-semibold">
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox className="max-h-60 overflow-y-auto">
                {DDI_OPTIONS.map((opt) => (
                  <ListBoxItem key={opt.ddi} id={opt.ddi} textValue={`${opt.flag} ${opt.ddi}`}>
                    <span className="flex items-center gap-2 text-xs">
                      <span className="text-base">{opt.flag}</span>
                      <span className="font-semibold text-foreground">{opt.ddi}</span>
                      <span className="text-muted truncate">{opt.country}</span>
                    </span>
                  </ListBoxItem>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        </div>

        {/* Campo de Telefone Formatado */}
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted">
            <Phone className="size-4" aria-hidden="true" />
          </div>
          <Input
            id={fieldId}
            name={name}
            type="tel"
            value={value}
            onChange={handleInputChange}
            placeholder={dynamicPlaceholder}
            autoComplete={autoComplete}
            required={isRequired}
            disabled={isDisabled}
            className="w-full pl-9 h-10 text-sm"
          />
        </div>
      </div>

      {description && <Description className="text-xs text-muted mt-1">{description}</Description>}
      <FieldError />
    </div>
  );
}
