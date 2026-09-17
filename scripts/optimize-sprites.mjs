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
 * 原始檔仍是唯一的素材真相（ChatGPT 所有），這裡只多產生一份「交付用」的編碼副本，
 * 屬於資產載入與效能，是 Claude 的範圍。取景一樣只在顯示階段用 CSS 處理。
 *
 * 用法：
 *   npm run assets:sprites          產生缺少或過期的交付檔
 *   npm run assets:sprites -- --check   只檢查是否最新（不寫檔），過期時以非 0 結束
 *
 * 產出的 `manifest.json` 記錄每個來源檔的 SHA-256，`tests/spriteDelivery.test.ts`
 * 會據此擋下「ChatGPT 換了圖但沒有重新產生交付檔」的情況。
 */
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_DIR = path.join(root, 'public/assets/characters/full-body');
const OUTPUT_DIR = path.join(root, 'public/assets/characters/web');
const MANIFEST = path.join(OUTPUT_DIR, 'manifest.json');

/** 交付檔的編碼設定。臉部與髮絲的細節在 quality 88 下看不出差異，Alpha 則保持無損。 */
const WEBP_OPTIONS = { quality: 88, alphaQuality: 100, effort: 6 };

const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');

async function loadManifest() {
  try {
    return JSON.parse(await readFile(MANIFEST, 'utf8'));
  } catch {
    return { encoder: 'webp', options: WEBP_OPTIONS, files: {} };
  }
}

async function main() {
  const checkOnly = process.argv.includes('--check');
  const sources = (await readdir(SOURCE_DIR)).filter((name) => name.endsWith('.png')).sort();
  const manifest = await loadManifest();
  const next = { encoder: 'webp', options: WEBP_OPTIONS, files: {} };
  const stale = [];

  let sharp;
  const encode = async (buffer) => {
    if (!sharp) {
      try {
        sharp = (await import('sharp')).default;
      } catch {
        throw new Error('需要 sharp 才能產生交付檔：npm install（sharp 在 devDependencies）');
      }
    }
    return sharp(buffer).webp(WEBP_OPTIONS).toBuffer();
  };

  for (const name of sources) {
    const source = await readFile(path.join(SOURCE_DIR, name));
    const hash = sha256(source);
    const output = `${path.basename(name, '.png')}.webp`;
    const recorded = manifest.files?.[output];
    const current = recorded?.sourceSha256 === hash
      && JSON.stringify(manifest.options) === JSON.stringify(WEBP_OPTIONS)
      && (await readFile(path.join(OUTPUT_DIR, output)).then(() => true, () => false));

    if (current) {
      next.files[output] = recorded;
      continue;
    }

    stale.push(output);
    if (checkOnly) continue;

    const encoded = await encode(source);
    await mkdir(OUTPUT_DIR, { recursive: true });
    await writeFile(path.join(OUTPUT_DIR, output), encoded);
    next.files[output] = { source: name, sourceSha256: hash, bytes: encoded.length, sourceBytes: source.length };
    console.log(`${name} ${(source.length / 1024).toFixed(0)}KB → ${output} ${(encoded.length / 1024).toFixed(0)}KB`);
  }

  if (checkOnly) {
    if (stale.length > 0) {
      console.error(`交付檔過期或缺少：${stale.join('、')}\n請執行 npm run assets:sprites`);
      process.exit(1);
    }
    console.log(`交付檔皆為最新（${sources.length} 張）`);
    return;
  }

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(MANIFEST, `${JSON.stringify(next, null, 2)}\n`);
  const before = Object.values(next.files).reduce((sum, file) => sum + file.sourceBytes, 0);
  const after = Object.values(next.files).reduce((sum, file) => sum + file.bytes, 0);
  console.log(`完成：${sources.length} 張，${(before / 1024 / 1024).toFixed(1)}MB → ${(after / 1024).toFixed(0)}KB`);
}

await main();
