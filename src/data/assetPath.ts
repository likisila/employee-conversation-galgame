import type { ImageCatalog } from '../domain/schema';

/**
 * 把資料中的「根目錄絕對路徑」素材（例如 `/assets/x.webp`）解析成部署 base 下的實際 URL。
 *
 * 內容資料以 `/assets/...` 記錄素材的邏輯位置（語意不變）；當網站部署在子路徑
 * （如 GitHub Pages 的 `/<repo>/`）時，需以 Vite 的 `import.meta.env.BASE_URL` 前綴，
 * 否則會指向網域根目錄而 404。
 *
 * - 只處理以 `/` 開頭的路徑；相對路徑或外部 URL（http、data:）原樣保留。
 * - base 為 `/` 時輸出與輸入相同，開發與測試不受影響。
 */
export function resolveAssetPath(src: string, base: string = import.meta.env.BASE_URL): string {
  if (!src.startsWith('/')) return src;
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return `${normalizedBase}${src.slice(1)}`;
}

/**
 * 回傳一份 ImageCatalog 副本，其中所有素材路徑欄位都已透過 resolveAssetPath 解析。
 * 只改路徑字串，不動 IDs、frame 索引或其他語意。
 */
export function resolveCatalogAssets(catalog: ImageCatalog, base?: string): ImageCatalog {
  const resolve = (src: string) => resolveAssetPath(src, base);
  return {
    characters: Object.fromEntries(
      Object.entries(catalog.characters).map(([id, sheet]) => [id, {
        ...sheet,
        src: resolve(sheet.src),
        // 逐張模式的每個表情各有一個路徑，一併解析，否則部署在子路徑時會 404。
        sources: sheet.sources
          ? Object.fromEntries(Object.entries(sheet.sources).map(([name, src]) => [name, resolve(src)]))
          : undefined,
      }]),
    ),
    backgrounds: Object.fromEntries(
      Object.entries(catalog.backgrounds).map(([id, bg]) => [id, { ...bg, src: resolve(bg.src) }]),
    ),
    screens: Object.fromEntries(
      Object.entries(catalog.screens).map(([id, bg]) => [id, { ...bg, src: resolve(bg.src) }]),
    ),
    ui: Object.fromEntries(Object.entries(catalog.ui).map(([id, src]) => [id, resolve(src)])),
    // sceneBackgrounds 的值是 background ID（非路徑）、transitions.asset 是 UI key，皆不需解析。
    sceneBackgrounds: { ...catalog.sceneBackgrounds },
    transitions: Object.fromEntries(Object.entries(catalog.transitions).map(([id, t]) => [id, { ...t }])),
    scenePresentation: Object.fromEntries(
      Object.entries(catalog.scenePresentation).map(([id, p]) => [id, { ...p }]),
    ),
  };
}
