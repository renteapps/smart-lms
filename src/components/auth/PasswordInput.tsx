"use client";

import React, { useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { Button, FieldError, InputGroup, Label, TextField } from "@heroui/react";
import { cn } from "@/lib/utils";

interface PasswordInputProps {
  id?: string;
  name?: string;
  label?: string;
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  isRequired?: boolean;
  isInvalid?: boolean;
  errorMessage?: string;
  description?: string;
  autoComplete?: string;
  className?: string;
}

export function PasswordInput({
  id = "password",
  name = "password",
  label = "Senha",
  placeholder = "Digite sua senha",
  value,
  defaultValue,
  onChange,
  isRequired = false,
  isInvalid = false,
  errorMessage,
  description,
  autoComplete = "current-password",
  className,
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <TextField
      name={name}
      value={value}
      defaultValue={defaultValue}
      onChange={onChange}
      isRequired={isRequired}
      isInvalid={isInvalid}
      fullWidth
      className={cn("w-full space-y-1.5", className)}
    >
      {label && <Label htmlFor={id} className="text-sm font-medium text-foreground">{label}</Label>}
      <InputGroup fullWidth className="w-full">
        <InputGroup.Prefix className="text-muted pl-3">
          <Lock className="size-4" aria-hidden="true" />
        </InputGroup.Prefix>

        <InputGroup.Input
          id={id}
          type={showPassword ? "text" : "password"}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="w-full text-sm"
        />

        <InputGroup.Suffix className="pr-1.5">
          <Button
            type="button"
            isIconOnly
            size="sm"
            variant="ghost"
            aria-label={showPassword ? "Ocultar senha" : "Ver senha em texto"}
            onClick={() => setShowPassword((prev) => !prev)}
            className="size-8 text-muted hover:text-foreground"
          >
            {showPassword ? (
              <EyeOff className="size-4" aria-hidden="true" />
            ) : (
              <Eye className="size-4" aria-hidden="true" />
            )}
          </Button>
        </InputGroup.Suffix>
      </InputGroup>

      {description && <p className="text-xs text-muted mt-1">{description}</p>}
      {errorMessage && <p className="text-xs font-semibold text-danger mt-1">{errorMessage}</p>}
    </TextField>
  );
}
