/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_API_URL: string;
  readonly VITE_BRAND_NAME?: string;
  readonly VITE_BRAND_PRIMARY_COLOR?: string;
  readonly VITE_BRAND_PRIMARY_COLOR_HOVER?: string;
  readonly VITE_BRAND_LOGO_URL?: string;
}
interface ImportMeta { readonly env: ImportMetaEnv; }
