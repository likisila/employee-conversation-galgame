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

/** 原始全身立繪的來源目錄，與交付用的 WebP 目錄（由 `npm run assets:sprites` 產生）。 */
const SPRITE_SOURCE_DIR = '/assets/characters/full-body/';
const SPRITE_DELIVERY_DIR = '/assets/characters/web/';

/**
 * 把原始全身立繪 PNG 換成同尺寸、同 Alpha 的 WebP 交付檔。
 *
 * 原始 PNG 每張 1.2–1.3 MB，一場常用到三四個表情；同尺寸 WebP 約 80 KB，是原檔的 6%，
 * 讀取畫面與場景中途換表情因此不必等好幾 MB。內容資料（property/images.json）仍然只記錄
 * 原始素材的位置，素材本身也完全沒有被修改或裁切——這裡只是選擇實際下載哪一份編碼。
 *
 * 交付檔由 `scripts/optimize-sprites.mjs` 產生並隨程式碼提交；
 * `tests/spriteDelivery.test.ts` 會確認每張被引用的原始 PNG 都有對應且未過期的交付檔。
 */
export function spriteDeliverySrc(src: string): string {
  if (!src.startsWith(SPRITE_SOURCE_DIR) || !src.endsWith('.png')) return src;
  return `${SPRITE_DELIVERY_DIR}${src.slice(SPRITE_SOURCE_DIR.length, -'.png'.length)}.webp`;
}

/**
 * 回傳一份 ImageCatalog 副本，其中所有素材路徑欄位都已透過 resolveAssetPath 解析。
 * 只改路徑字串，不動 IDs、frame 索引或其他語意。
 */
export function resolveCatalogAssets(catalog: ImageCatalog, base?: string): ImageCatalog {
  const resolve = (src: string) => resolveAssetPath(src, base);
  // 立繪多一步：先換成交付用的 WebP，再套部署 base。
  const resolveSprite = (src: string) => resolve(spriteDeliverySrc(src));
  return {
    characters: Object.fromEntries(
      Object.entries(catalog.characters).map(([id, sheet]) => [id, {
        ...sheet,
        src: resolveSprite(sheet.src),
        // 逐張模式的每個表情各有一個路徑，一併解析，否則部署在子路徑時會 404。
        sources: sheet.sources
          ? Object.fromEntries(Object.entries(sheet.sources).map(([name, src]) => [name, resolveSprite(src)]))
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
