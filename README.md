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
