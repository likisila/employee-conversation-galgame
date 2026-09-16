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

## 後續可擴充

- 角色立繪 / 表情 / 背景圖外部化到 `property/`。
- 多語系 `property/locales/zh-TW.json`、`en.json`。
- JSON Editor / 劇本編輯器，讓非工程師直接改內容。
- 存檔 / 讀檔。
- AI 產生 scene draft，但仍存回同一套 schema。
## Sora 劇情過場

`property/sora-cutscenes.json` 定義七段 8 秒、720p 的 Sora 過場，輸出會直接取代 `public/assets/cutscenes/` 內同名的本機 fallback MP4。完整一輪預估費用上限為 USD 5.60。

先檢查提示，不產生費用：

```bash
npm run videos:sora -- --dry-run
```

本機生成：

```bash
OPENAI_API_KEY="..." SORA_MAX_COST_USD=5.60 npm run videos:sora
```

也可只生成指定鏡頭：

```bash
OPENAI_API_KEY="..." npm run videos:sora -- --ids=intro,ending-trust
```

請勿把 API key 寫入檔案或提交版本控制。若要由 GitHub 生成，將 key 存為 repository secret `OPENAI_API_KEY`，再手動執行 **Generate Sora cutscenes** workflow；成功後 workflow 會提交 MP4 與生成報告。
