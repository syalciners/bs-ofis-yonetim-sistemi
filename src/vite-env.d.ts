/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_APP_MODE?: 'production' | 'demo' | 'test'
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
  readonly VITE_PORTAL_URL?: string
  readonly VITE_ENABLED_MODULES?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}