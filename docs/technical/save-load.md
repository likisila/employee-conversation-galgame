# 存檔 / 讀檔（Save / Load）

> Owner: Claude（工程）。此功能不改變任何 GPT-owned 故事、角色或美術語意，只序列化玩家進度。

## 目標

在不 hard-code 任何遊戲內容的前提下，讓玩家關掉分頁後仍能繼續同一場對話。

## 架構

```text
StoryEngine.snapshot  ──→  StorySnapshot { sceneId, state }  ──→  SaveStore.save()  ──→  localStorage
StoryEngine.restore()  ←──  StorySnapshot                    ←──  SaveStore.load()  ←──  localStorage
```

- **`StorySnapshot`**（`src/engine/StoryEngine.ts`）：可序列化的進度，只含目前場景 ID 與狀態數值，不含任何顯示文字或素材路徑。
- **`StoryEngine.snapshot`**：回傳目前進度的深拷貝（state 為複本，非活引用）。
- **`StoryEngine.restore(snapshot)`**：把進度套回引擎；場景不存在時丟出錯誤，交由呼叫端決定是否丟棄過期存檔。
- **`SaveStore`**（`src/data/saveStore.ts`）：單一遊戲的持久化層。

## 存檔封裝格式

```json
{
  "version": 1,
  "gameId": "<game.id>",
  "updatedAt": "<ISO timestamp>",
  "snapshot": { "sceneId": "feedback", "state": { "trust": 2 } }
}
```

- 儲存 key：`ecg:save:<gameId>`。
- `SAVE_FORMAT_VERSION` 在格式變動時遞增；版本不符的舊存檔會被視為「無存檔」並清除。

## 健壯性原則

`SaveStore` 所有 Storage 存取都包在 `try/catch`，任一失敗都退化為「沒有存檔」而非崩潰：

- 無 `localStorage`（SSR、隱私模式）→ `save()` 回傳 `false`，`load()` 回傳 `null`。
- JSON 損壞、版本不符、`gameId` 不符、state 含非原始值 → `load()` 回傳 `null` 並自我清除壞資料。
- 寫入丟例外（配額用盡）→ `save()` 回傳 `false`。

`storage` 建構子參數可注入，測試用記憶體實作即可覆蓋以上分支，不需 DOM。

## UI 串接

- `main.ts` 在標題畫面呼叫 `saveStore.load()`；有存檔就顯示「繼續上次」。
- 遊戲畫面透過 `RenderHooks`：`onAdvance` 在每次選擇/繼續後自動存檔，`onRestart` 在結局重新開始時清除存檔。
- 新局（標題的「重新開始」/結局的「重新開始」）會先清除舊存檔再從起始場景開始。

## 內容契約

- 存檔 key 用 `character ID` / `sceneId` / 狀態變數名，不用任何 display text。
- 新增角色、章節或狀態變數都不需要改動存讀檔程式。
- 文案（繼續上次 / 重新開始）放在 `property/ui.json`，引擎有預設值 fallback。
