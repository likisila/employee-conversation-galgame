#!/usr/bin/env node
/**
 * 立繪交付檔產生器：把 ChatGPT 交付的原始全身透明 PNG 轉成同尺寸的 WebP，放在
 * `public/assets/characters/web/`，供瀏覽器實際下載。
 *
 * 為什麼要這一層：原始 PNG 每張約 1.2–1.3 MB，十張合計 12.7 MB。一場對話常常會用到
 * 三到四個表情，光是立繪就要下載 4–5 MB，讀取畫面因此卡很久、場景中途換表情也會慢一拍。
 * 同尺寸（1024×1536）、保留完整 Alpha 的 WebP 約 60–90 KB，大約是原檔的 6%。
 *
 * 邊界：這裡**不修改、不覆寫、不裁切、不重新量化色盤、不去背**任何原始 PNG。
 * 取景一樣只在顯示階段用 CSS 處理。
 *
 * 用法：
 *   npm run assets:sprites          產生缺少或過期的交付檔
 *   npm run assets:sprites -- --check   只檢查是否最新（不寫檔），過期時以非 0 結束
 *
 * 產出的 `manifest.json` 記錄每個來源檔的 SHA-256，`tests/spriteDelivery.test.ts`
 * 會據此擋下「ChatGPT 換了圖但沒有重新產生交付檔」的情況。
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runWebpDelivery } from './lib/webpDelivery.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

await runWebpDelivery({
  sourceDir: path.join(root, 'public/assets/characters/full-body'),
  outputDir: path.join(root, 'public/assets/characters/web'),
  // 臉部與髮絲的細節在 quality 88 下看不出差異，Alpha 則保持無損。
  options: { quality: 88, alphaQuality: 100, effort: 6 },
  command: 'npm run assets:sprites',
}, process.argv.includes('--check'));
