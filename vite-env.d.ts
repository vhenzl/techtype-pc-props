/// <reference types="vite/client" />

interface ViteTypeOptions {
  // Makes the type of ImportMetaEnv strict (disallows unknown keys).
  strictImportMetaEnv: unknown;
}

interface ImportMetaEnv {
  readonly VITE_DATABASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
