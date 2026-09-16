# Employee Conversation Gal Game

一個以 **TypeScript + Vite** 實作的資料驅動對話 / Gal Game 引擎，適合拿來做主管與員工的一對一對話訓練。

核心原則：**內容放 `property/`，引擎放 `src/`。角色名稱、對話、選項與分支都不 hard-code。**

## 快速開始

```bash
npm install
npm run dev
```

## 專案結構

```text
.
├── property/                 # 可直接編輯的遊戲資料
│   ├── manifest.json
│   ├── game.json
│   ├── characters.json
│   ├── ui.json
│   └── scenes/
├── src/
│   ├── data/                 # 載入與驗證 property
│   ├── domain/               # TypeScript schema + runtime validation
│   ├── engine/               # 對話、條件、效果與跳轉
│   └── ui/                   # 畫面 rendering
├── tests/
└── .github/
```

## 不 hard-code 的設計

角色顯示名稱放在 `property/characters.json`。場景只保存角色 ID，因此改名字只改一個地方。

所有對話、選項與跳轉位於 `property/scenes/*.json`。分支條件與狀態效果也是資料，而不是寫死在 TypeScript。

```json
{
  "conditions": [{ "variable": "trust", "operator": "gte", "value": 2 }],
  "effects": [{ "variable": "clarity", "operation": "add", "value": 1 }]
}
```

## 驗證

```bash
npm run typecheck
npm test
npm run build
```

## 部署（GitHub Pages）

`.github/workflows/deploy.yml` 會在 push 到 `main` 時自動 build 並部署到 GitHub Pages。

啟用方式：**Settings → Pages → Build and deployment → Source** 選 **GitHub Actions**。之後每次 push 到 `main` 就會自動更新，網址為 `https://<owner>.github.io/<repo>/`。

因為專案站服務在 `/<repo>/` 子路徑，workflow 以 `--base=/<repo>/` build；`property/images.json` 內的 `/assets/...` 邏輯路徑會在載入時透過 `import.meta.env.BASE_URL` 解析成正確 URL（見 `src/data/assetPath.ts`），資料本身不需修改。

## 存檔 / 讀檔

進度會自動存進瀏覽器 `localStorage`：玩家每做一次選擇或按繼續，就寫入一份快照（目前場景 + 狀態數值）。

- 標題畫面偵測到存檔時，會多出「繼續上次」按鈕；沒有存檔時只顯示「開始對話」。
- 存檔採版本化封裝（`ecg:save:<gameId>`）。版本不符、資料損壞或屬於其他遊戲的存檔會被安全丟棄並清除。
- 若存檔指向的場景在內容改版後已不存在，讀取時會丟棄存檔並改開新局，而不是崩潰。
- 在隱私模式或配額用盡等無法存取 `localStorage` 的情況下，遊戲照常進行，只是不做持久化。

實作：`src/data/saveStore.ts`（持久化層，storage 可注入以便測試）與 `StoryEngine.snapshot` / `restore()`（引擎快照）。詳見 `docs/technical/save-load.md`。

## 後續可擴充

- 角色立繪 / 表情 / 背景圖外部化到 `property/`。
- 多語系 `property/locales/zh-TW.json`、`en.json`。
- JSON Editor / 劇本編輯器，讓非工程師直接改內容。
- 多存檔槽 / 手動存讀檔 UI。
- AI 產生 scene draft，但仍存回同一套 schema。
## Sora 劇情過場

`property/sora-cutscenes.json` 定義 8 秒、720p 的真人寫實微電影過場，涵蓋共通主線與互斥結局。所有鏡頭以正式資遣劇本為準；鏡頭數、單價與完整生成上限以 manifest 及 dry-run 輸出為準。

`property/cutscenes.json` 只保存影片格式、來源與缺檔策略；實際 Sora 提示、觸發點、正式場景對應、角色連戲、道具狀態與生成後檢查表位於 `property/sora-cutscenes.json`。影片尚未生成或缺檔時，遊戲應略過影片並直接進入對應的正式場景，不使用舊版替代影片。

先驗證 manifest 並檢查最終提示，不產生費用：

```bash
npm run videos:sora -- --dry-run
```

本機生成：

```bash
OPENAI_API_KEY="..." npm run videos:sora
```

也可只生成指定鏡頭：

```bash
OPENAI_API_KEY="..." npm run videos:sora -- --ids=layoff-notification,ending-true
```

請勿把 API key 寫入檔案或提交版本控制。若要由 GitHub 生成，將 key 存為 repository secret `OPENAI_API_KEY`，再手動執行 **Generate Sora cutscenes** workflow；成功後 workflow 會提交 MP4 與生成報告。

每次生成後必須依 manifest 的 `postGenerationReview` 驗證：不得出現 GAL GAME 對話框或 HUD、三位演員與服裝必須連戲、Day 1 的會議室鏡頭必須有 HR 曾雅琳，且僅 TRUE END 可在三週後由林雨澄主動開啟私人會面。

舊版 `render_cutscenes.py`、自動合成立繪／對話卡的 workflow 與其輸出影片已移除，避免後續素材更新重新產生錯誤的 GAL GAME 式 Cutscene。
