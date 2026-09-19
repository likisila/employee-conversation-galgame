#!/usr/bin/env node
/**
 * 分鏡影格交付檔產生器：把 ChatGPT 交付的 Runway 起始關鍵影格（1672×941 PNG，每張約 2 MB）
 * 轉成 1280×720 的 WebP，放在 `public/assets/cutscenes/storyboard/`。
 *
 * 用途：正式 MP4 還沒生成的過場，先以分鏡影格輪播當 placeholder（見 `src/ui/cutscene.ts`）。
 * 原始 PNG 十三張合計約 24 MB，直接出貨會把 Cloudflare Pages 的上傳 zip 撐過 25 MB；
 * 原始檔所在的 `keyframes/` 已列在 `vite.config.ts` 的 SOURCE_ONLY_PUBLIC_DIRS，不隨遊戲出貨。
 *
 * 1672×941 與 16:9 只差不到一個像素，以置中 cover 縮到 1280×720 即為過場影片的正式畫幅；
 * 原始 PNG 不修改、不覆寫。
 *
 * 用法：
 *   npm run assets:storyboard            產生缺少或過期的交付檔
 *   npm run assets:storyboard -- --check 只檢查是否最新（不寫檔）
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runWebpDelivery } from './lib/webpDelivery.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

await runWebpDelivery({
  sourceDir: path.join(root, 'public/assets/cutscenes/keyframes/runway-v2'),
  outputDir: path.join(root, 'public/assets/cutscenes/storyboard'),
  options: { resize: { width: 1280, height: 720, fit: 'cover' }, quality: 84, effort: 6 },
  command: 'npm run assets:storyboard',
}, process.argv.includes('--check'));
