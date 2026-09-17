interface ImportMetaEnv {
  readonly BASE_URL: string;
  readonly [key: string]: string | boolean | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
  /** 可傳單一 glob，或一組 glob（以 `!` 開頭者為排除）。 */
  glob(
    pattern: string | string[],
    options?: { eager?: boolean; import?: string },
  ): Record<string, unknown>;
}
