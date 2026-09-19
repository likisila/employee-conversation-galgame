/**
 * 「原始素材 → 交付用 WebP」的共用流程：立繪與分鏡影格都走這一條。
 *
 * 邊界：這裡**不修改、不覆寫**任何原始 PNG。原始檔仍是唯一的素材真相（ChatGPT 所有），
 * 這裡只多產生一份交付用的編碼副本，屬於資產載入與效能，是 Claude 的範圍。
 *
 * 每個輸出目錄有一份 `manifest.json`，記錄來源檔的 SHA-256 與編碼設定；
 * 來源換過、設定改過或交付檔不見時才重新編碼。測試據此擋下「換了圖卻沒重新產生交付檔」。
 */
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');

async function loadManifest(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return { encoder: 'webp', options: {}, files: {} };
  }
}

/**
 * @param {object} job
 * @param {string} job.sourceDir  原始 PNG 目錄
 * @param {string} job.outputDir  交付 WebP 目錄
 * @param {object} job.options    寫進 manifest 的編碼設定；`resize` 會交給 sharp.resize，其餘交給 sharp.webp
 * @param {string} job.command    過期時提示執行的指令
 * @param {boolean} checkOnly     只檢查、不寫檔，過期時以非 0 結束
 */
export async function runWebpDelivery({ sourceDir, outputDir, options, command }, checkOnly) {
  const manifestPath = path.join(outputDir, 'manifest.json');
  const sources = (await readdir(sourceDir)).filter((name) => name.endsWith('.png')).sort();
  const manifest = await loadManifest(manifestPath);
  const next = { encoder: 'webp', options, files: {} };
  const stale = [];
  const { resize, ...webpOptions } = options;

  let sharp;
  const encode = async (buffer) => {
    if (!sharp) {
      try {
        sharp = (await import('sharp')).default;
      } catch {
        throw new Error('需要 sharp 才能產生交付檔：npm install（sharp 在 devDependencies）');
      }
    }
    const image = sharp(buffer);
    if (resize) image.resize(resize);
    return image.webp(webpOptions).toBuffer();
  };

  for (const name of sources) {
    const source = await readFile(path.join(sourceDir, name));
    const hash = sha256(source);
    const output = `${path.basename(name, '.png')}.webp`;
    const recorded = manifest.files?.[output];
    const current = recorded?.sourceSha256 === hash
      && JSON.stringify(manifest.options) === JSON.stringify(options)
      && (await readFile(path.join(outputDir, output)).then(() => true, () => false));

    if (current) {
      next.files[output] = recorded;
      continue;
    }

    stale.push(output);
    if (checkOnly) continue;

    const encoded = await encode(source);
    await mkdir(outputDir, { recursive: true });
    await writeFile(path.join(outputDir, output), encoded);
    next.files[output] = { source: name, sourceSha256: hash, bytes: encoded.length, sourceBytes: source.length };
    console.log(`${name} ${(source.length / 1024).toFixed(0)}KB → ${output} ${(encoded.length / 1024).toFixed(0)}KB`);
  }

  if (checkOnly) {
    if (stale.length > 0) {
      console.error(`交付檔過期或缺少：${stale.join('、')}\n請執行 ${command}`);
      process.exit(1);
    }
    console.log(`交付檔皆為最新（${sources.length} 張）`);
    return;
  }

  await mkdir(outputDir, { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify(next, null, 2)}\n`);
  const before = Object.values(next.files).reduce((sum, file) => sum + file.sourceBytes, 0);
  const after = Object.values(next.files).reduce((sum, file) => sum + file.bytes, 0);
  console.log(`完成：${sources.length} 張，${(before / 1024 / 1024).toFixed(1)}MB → ${(after / 1024).toFixed(0)}KB`);
}
