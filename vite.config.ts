import { rm } from 'node:fs/promises';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';

/**
 * `public/` 底下只作為素材來源、執行時從不下載的目錄（相對於 `public/`）。
 *
 * `characters/full-body/` 是 ChatGPT 交付的原始全身 PNG（十張約 12.8 MB）。執行時一律經
 * `spriteDeliverySrc` 換成 `characters/web/` 的 WebP，PNG 本身不會被請求。Vite 會把整個
 * `public/` 原樣複製進 `dist/`，不排除的話它們只會把 Cloudflare Pages 的上傳 zip 撐過 25 MB。
 * 原始檔仍留在 repo，只是不出貨；`tests/buildOutput.test.ts` 確認這裡沒有執行時會用到的路徑。
 */
export const SOURCE_ONLY_PUBLIC_DIRS = ['assets/characters/full-body'];

function dropSourceOnlyAssets(): Plugin {
  let outDir = 'dist';
  return {
    name: 'drop-source-only-assets',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    async closeBundle() {
      for (const dir of SOURCE_ONLY_PUBLIC_DIRS) {
        await rm(path.join(outDir, dir), { recursive: true, force: true });
      }
    },
  };
}

export default defineConfig({
  server: { port: 5173 },
  build: { sourcemap: true },
  plugins: [dropSourceOnlyAssets()],
});
