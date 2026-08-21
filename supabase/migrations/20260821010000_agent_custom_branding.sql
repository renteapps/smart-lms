-- Adiciona colunas para personalização visual dos agentes (foto de perfil, cor de tema e ícone SVG)
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS theme_color TEXT,
  ADD COLUMN IF NOT EXISTS icon_svg TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT;
