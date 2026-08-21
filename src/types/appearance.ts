export interface AppearanceConfig {
  platformName: string;
  slogan: string;
  primaryColor: string;
  theme: string;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  ogImageUrl?: string | null;
}

export const DEFAULT_APPEARANCE: AppearanceConfig = {
  platformName: "Smart LMS",
  slogan: "Aprendizagem humana para habilidades que transformam carreiras.",
  primaryColor: "#3157B7",
  theme: "light",
  logoUrl: null,
  faviconUrl: null,
  ogImageUrl: null,
};
