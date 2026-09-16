interface ImportMetaEnv {
  readonly BASE_URL: string;
  readonly [key: string]: string | boolean | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
  glob(
    pattern: string,
    options?: { eager?: boolean; import?: string },
  ): Record<string, unknown>;
}
