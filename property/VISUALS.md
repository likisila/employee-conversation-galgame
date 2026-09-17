# Visual property model

視覺資產採資料驅動。場景與 TypeScript 不直接依賴圖片檔名。

## `images.json`

- `characters`：角色 sprite sheet、表情 frame。
- `backgrounds`：背景圖片與 focal point。
- `screens`：title / loading 等全螢幕畫面。
- `ui`：對話框、選項框、wipe 等 UI 素材。
- `transitions`：轉場時間與可選 UI asset。
- `scenePresentation`：每個 scene 的背景、主要角色、表情與轉場。

例如：

```json
{
  "intro": {
    "background": "meeting-room",
    "character": "employee",
    "expression": "uneasy",
    "transition": "fade"
  }
}
```

修改角色表情或背景時，只修改 `property/images.json`。不要在 `src/ui/render.ts` 寫 scene id 特例。

## Asset folders

```text
public/assets/
├── characters/
├── backgrounds/
├── screens/
└── ui/
```

檔案路徑可以替換，只要同步更新 `images.json` 即可。

## 互動控制元件規格

以下規格由 ChatGPT 定案，Claude 負責實作與 UX 驗證。

### 回到上一句

- 使用單一線框左箭頭，語意是「退回一句」，不使用會被理解成連續倒帶的三箭頭。
- 不新增圖片素材；由程式產生 inline SVG。圖示 20×20 px、線寬 1.75 px，端點與轉角使用圓角。
- 按鈕點擊範圍為 44×44 px，圖示維持 20×20 px；鍵盤焦點框沿用全域 3 px focus ring。
- 預設色使用 `--teal`，hover／focus 使用 `--amber`。
- 不使用無限循環動畫。第一次出現時播放一次 180 ms 的淡入：由 `opacity: 0`、`translateX(2px)` 到正常位置，形成 2 px 向左移動；`prefers-reduced-motion` 下不播放。
- 箭頭移出 `.dialogue` 後，移除原本只為避開箭頭而存在的 1.9rem 左側留白。實作時仍須避免按鈕點擊區遮住台詞或手機選項。
- 無障礙名稱使用 `backLabel`。

### 過場影片控制列

- 控制列維持右下角，距 safe area 至少 16 px；按鈕間距 8 px，每個按鈕至少 44×44 px。
- 背景使用深藍黑半透明膠囊（`rgba(8, 21, 29, .78)`）與 8 px 背景模糊；邊框使用半透明白色，hover／focus 時轉為 `--teal`。
- 靜音鍵使用線框 Speaker／Speaker Slash 圖示，保留 `aria-pressed` 與 `muteCutsceneLabel`。跳過鍵顯示 `skipCutsceneLabel`，並搭配同系列的 Skip Forward 線框圖示。
- 不使用 `🔊`、`🔇`、`▶▶` 等 emoji 或字型符號；同一控制列只使用一套圖示語言。
- 狀態切換只做 160 ms 的顏色與背景變化，不縮放、不位移；鍵盤焦點順序為「靜音 → 跳過」。

### 通關後的決策點選單

- 接受 PR #26 的浮層流程、焦點管理、鍵盤操作、轉場與響應式 UX，不要求撤回或重做。
- 可沿用既有 `.choice`、`.secondary-action` 與 `--surface` 視覺語彙；場景標題使用青色小字，選項全文維持主要文字層級。
- 結局畫面不另外加入說明句；「回到決策點」按鈕與選單標題已足以說明用途。
- 正式文案由 `rewindLabel`、`rewindPrompt`、`rewindChoiceLabel`、`rewindCloseLabel` 提供。
