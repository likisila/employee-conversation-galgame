# Visual property model

視覺資產採資料驅動。場景與 TypeScript 不直接依賴圖片檔名。

## `images.json`

- `characters`：角色 sprite sheet，或各表情獨立的透明 PNG。
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

## 角色立繪取景規格

角色素材一律保留原始 1024×1536 全身透明 PNG；不得為了場景取景而裁切、重新編碼、量化色盤、覆寫原檔，或建立內容相同的裁切版素材。畫面需要只露上半身時，由程式在顯示階段裁切。

取景應由目前顯示的背景決定，不在 renderer 內寫死 scene id。Claude 可在背景資料加入 `characterFraming` 或採用等價的型別化設定；確切 schema 與實作方式由 Claude 決定。若未設定，預設使用 `full`；個別場景或台詞只有確有分鏡例外時才覆寫。

以下顯示規格依使用者最新指示與 `Claude-20260917-1215` 更新，取代先前寬景顯示全身的規格。`full` 保留既有資料名稱，不代表畫面要露出雙腳。

### `full`：標準半身

- 適用於有明確地板與足夠站立空間的寬景，例如辦公室。
- 所有版位只顯示頭頂至腰部／大腿，不露腳。桌機與橫版人物靠左，疊在對話框前，台詞與選項位於人物右側；人物下緣由畫面裁切。
- 手機直版維持置中半身，依角色左右安排微偏，人物中心約在畫面寬度的 37%／63%；下半身由對話框遮住。
- 接受既有標準取景露出原圖約 60% 的基準；實際可見範圍依視窗調整，頭頂完整、文字不被遮擋優先。尺寸與位置不得隨台詞長度或表情改變。

### `upper-body`：近景上半身

- `moon-meeting-room-rain` 使用此模式；凡目前背景為該會議室近景都自動套用，包括 s3、s5、s7、s8 與沿用該背景的結局段落。
- 在標準半身基礎上再推近一級；桌機／橫版接受露出比例約 52% 的基準，人物仍靠左並疊在面板前。手機直版沿用上述半身版位，不要求額外推近。
- 不更換素材、不改 Alpha，只調整顯示尺寸、定位與可視範圍。

### `none`：不疊加立繪

- 劇情 CG 已包含主要敘事焦點時使用，例如 `cg-rights-packet`、`cg-badge-flip`、`cg-true-reflection`。
- 顯示此類背景時預設不另外疊加角色立繪，避免全身人物壓住桌面特寫或重複敘事主體；未來如有明確分鏡需求，再以資料層例外開啟。

### 驗收重點

- 桌機與手機都不得出現腳踩會議桌、頭頂被切、透明邊緣變色或劇情 CG 被立繪遮住；下半身與側邊透明留白可以由畫面裁切。
- 同場景切換角色或表情時，取景模式與定位不得跳動。
- 部署在子路徑時，各表情交付圖仍須正確載入；既有 sprite sheet 相容模式不可回歸。

### 素材交付

- PNG 是原始美術檔，WebP 是 Claude 維護的載入交付檔。允許在不覆寫 PNG 的前提下產生同尺寸、Alpha 無損的 WebP。
- 後續 ChatGPT 更換 PNG 時須明列素材清單，交由 Claude 執行 `npm run assets:sprites`，一併提交 `public/assets/characters/web/` 與 manifest，確認來源及交付檔同步後再整合。

### s4／s6 文件特寫分鏡（待 Claude 整合）

- 採用 `Claude-20260917-1120` 的方案一：`s4-notice` 與 `s6-receipt` 的預設背景改為 `moon-meeting-room-rain`，人物使用該背景的半身取景。
- s4 只在旁白「藍色資料夾特寫。雨水在玻璃上拉出一條長痕。」顯示 `cg-rights-packet`；下一句周予安「失去主要客戶後……」立刻回會議室並恢復說話者立繪，之後維持人物鏡頭至選項頁。
- s6 只在第一句「雅琳把藍色資料夾轉向雨澄……打開第一頁。」顯示 `cg-rights-packet`；第二句雅琳「我逐項說明……」回會議室並恢復雅琳立繪，後續簽收攻防維持人物鏡頭。
- CG 保持 `none`，不疊人物；返回會議室時須同時恢復角色，避免 `character: null` 延續。條件分支、台詞、選項與路由不變。背景與角色欄位由 Claude 整合。
- 結局的 `cg-badge-flip`、`cg-true-reflection` 與既有 `character: null` 離場段落維持既定分鏡。

### 轉場素材

- `scene-wipe.svg` 保留深藍漸層與細顆粒，移除中央水平裝飾線。標題維持既有置中版位；桌機與手機裁切後都不應有線穿過文字。

### 私訊打字的視覺狀態

- 沿用現有訊息卡、頭像、字體與配色。游標使用文字同色，寬 2 px、高 1.05em，與文字間距 2 px。
- 接受目前 1 秒游標閃爍、未送出泡泡不透明度 .78，以及送出 240 ms、由下移 .3rem／縮放 .985 回到正常的呈現；送出不透明度由 .65 回到 1。實作與節奏控制由 Claude 維護。
- 接受 `Claude-20260917-1345` 的點擊完成、回溯不重播、減少動態效果與固定對話框高度行為。
- `drafts` 必須與該句正式文字一致，改寫時一併檢查。保留 s2 與 END 04 現有草稿；END 03 維持「輸入道歉、未送出、關閉視窗」，不新增打字後刪除，避免改變既有敘事動作。

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
