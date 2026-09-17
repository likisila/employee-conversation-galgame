# 存檔 / 讀檔（Save / Load）

> Owner: Claude（工程）。此功能不改變任何 GPT-owned 故事、角色或美術語意，只序列化玩家進度。

## 目標

在不 hard-code 任何遊戲內容的前提下，讓玩家關掉分頁後仍能繼續同一場對話。

## 架構

```text
StoryEngine.snapshot  ──→  StorySnapshot { sceneId, state, lineIndex,   ──→  SaveStore.save()  ──→  localStorage
                                          watchedCutscenes, decisions }
StoryEngine.restore()  ←──  StorySnapshot                                ←──  SaveStore.load()  ←──  localStorage
```

- **`StorySnapshot`**（`src/engine/StoryEngine.ts`）：可序列化的進度，只含 ID 與數值，不含任何顯示文字或素材路徑：
  - `sceneId`、`state`：停在哪一場、目前的狀態數值。
  - `lineIndex`：該場讀到第幾句。
  - `watchedCutscenes`：已播完或跳過的過場影片 ID，讓重新載入不重播。
  - `decisions`：這一輪走過的決策點（場景、停在哪一句、選擇「之前」的狀態、選了哪個選項 ID），供通關後的「回到決策點」使用。
  除 `sceneId`、`state` 外都是選填：舊存檔缺這些欄位時分別退化為「從第一句開始」「都沒看過」，不會丟棄整份存檔。
- **決策紀錄的反推**：`decisions` 是後來才加的欄位。缺少（或因內容改版被截斷成空）時，`restore()` 會從 `startScene` 窮舉選擇組合，找出「停在存檔場景、狀態完全相同」的路徑並據此重建決策點；恰好一條才採用，零條或多條都留空，避免列出玩家沒做過的選擇。窮舉有節點上限（`REBUILD_NODE_LIMIT`），內容長大後走不完就當作推不出來，不會讓讀檔卡住。
- **`StoryEngine.snapshot`**：回傳目前進度的深拷貝（state 為複本，非活引用）。
- **`StoryEngine.restore(snapshot)`**：把進度套回引擎；場景不存在時丟出錯誤，交由呼叫端決定是否丟棄過期存檔。
- **`SaveStore`**（`src/data/saveStore.ts`）：單一遊戲的持久化層。

## 存檔封裝格式

```json
{
  "version": 1,
  "gameId": "<game.id>",
  "updatedAt": "<ISO timestamp>",
  "snapshot": {
    "sceneId": "ending-true",
    "state": { "boundary": 3 },
    "lineIndex": 0,
    "watchedCutscenes": ["02_layoff_notification"],
    "decisions": [
      { "sceneId": "s2-invite", "lineIndex": 2, "state": { "boundary": 0 }, "choiceId": "invite-clear" }
    ]
  }
}
```

- 儲存 key：`ecg:save:<gameId>`。
- `SAVE_FORMAT_VERSION` 在格式變動時遞增；版本不符的舊存檔會被視為「無存檔」並清除。

## 健壯性原則

`SaveStore` 所有 Storage 存取都包在 `try/catch`，任一失敗都退化為「沒有存檔」而非崩潰：

- 無 `localStorage`（SSR、隱私模式）→ `save()` 回傳 `false`，`load()` 回傳 `null`。
- JSON 損壞、版本不符、`gameId` 不符、state 含非原始值 → `load()` 回傳 `null` 並自我清除壞資料。
- 選填欄位（`lineIndex`、`watchedCutscenes`、`decisions`）格式不對 → 只忽略該欄位，其餘進度照常讀回。`decisions` 是一條有序路徑，任一筆壞掉就整個欄位忽略，以免「回到第幾個決策點」錯位。
- 寫入丟例外（配額用盡）→ `save()` 回傳 `false`。

`storage` 建構子參數可注入，測試用記憶體實作即可覆蓋以上分支，不需 DOM。

## UI 串接

- `main.ts` 在標題畫面呼叫 `saveStore.load()`；有存檔就顯示「繼續上次」。
- 遊戲畫面透過 `RenderHooks`：`onAdvance` 在每次選擇/繼續後自動存檔，`onRestart` 在結局重新開始時清除存檔。
- 新局（標題的「重新開始」/結局的「重新開始」）會先清除舊存檔再從起始場景開始。

## 內容契約

- 存檔 key 用 `character ID` / `sceneId` / 狀態變數名，不用任何 display text。
- 新增角色、章節或狀態變數都不需要改動存讀檔程式。
- 文案（繼續上次 / 重新開始 / 回到決策點）放在 `property/ui.json`，引擎有預設值 fallback。
- 決策點清單顯示的是場景 `title` 與選項 `text`，都從 `property/` 讀取；存檔本身只記 ID，內容改版後對不上的紀錄會從該筆起截斷。
