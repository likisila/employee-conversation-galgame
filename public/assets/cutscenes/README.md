# Cutscene videos

**00 已核准並部署為本地正式素材；04、06 仍停止生成。** 使用者於 2026-09-28 指定提供的 10 秒 MP4 作為 [`00_final_documents.mp4`](00_final_documents.mp4)。既有 `final-documents` cue 已使用這個檔名，不需修改 runtime。

最新完整影格集合與未來穩定路徑是 [`keyframes/current/`](keyframes/current/)；00-A／B／C 現在只保留為未來重製參考，不是核准成片的組成檔。04、06 的 4 張影格仍可供審查。`runway-v2/`、`runway-v3/`、`v4-review/` 都是版本快照。

04、06 的製作順序仍是：核准關鍵影格 → image-to-video → 剪輯／轉檔 → 實機驗收。00 已直接採用使用者核准成片，不再進入生成流程。

## 目前素材狀態

- 既有關鍵影格 13 張中：6 張沿用、1 張重畫、6 張退出正式剪輯。
- 先前的 00-B 重畫與 11 張結局影格保留在 `keyframes/runway-v3/` 作版本快照；2026-09-28 劇情修正後，舊 00-A／B 不再符合現役分鏡。
- `property/cutscene-cues.json` 目前是 2 段 cue（`final-documents`／`ending-true`）的 scene／line anchor，已完成接線；分鏡 fallback 共 5 張（00-A／B／C、06-B／C；缺 MP4 或無法解碼時輪播，見下方「目前時序」）。04 已於 2026-11-17 依[整合規格 v2](../../../docs/media/cutscene-mv-integration-20261117.md)取消：cue 與 04-B／04-C 分鏡交付檔都已移除，`keyframes/current/` 的原圖保留作製作參考但不再出貨（`npm run assets:storyboard` 只交付 cue 引用的鏡號）。
- 07、08、09 雖已接線，但影片動作會完整重演緊接在前的結局敘述，目前列為創作暫停；不因 cue 存在就送生成。
- 正式影片目前 1／3：00 已核准；04、06 尚未製作。舊 00-A／B 與其完整合併候選不得部署或挪作新版素材。
- `keyframes/runway-v2/` 只是沿用舊路徑的素材池，不代表仍採 v2 分鏡；逐張決議見 [關鍵影格複審](keyframes/runway-v2/REVIEW.md)。
- 隔離區的舊 MP4 只供比對，不得回放或直接復用，詳見 [pending-review 說明](../../../coordination/pending-review/cutscenes/README.md)。

## 目前時序

`property/cutscene-cues.json` 目前接線的兩段 cue（技術對應由 Claude 維護，內容仍以 `property/sora-cutscenes.json` 為準）：

- `final-documents`（`00_final_documents.mp4`）：`anchor.type: "scene"`，`s1-final-cut` 進場景前播放。00 已核准並使用這個檔名，不是分鏡 fallback。
- （已取消）`boundary-question`：`s7-recommend-converge` 讀完「冷氣停了。她等著我回答。」後直接顯示 Choice 5，沒有影片、分鏡或等待。
- `ending-true`（`06_ending_true.mp4`）：`anchor.type: "line"`，接到 `ending-true` 場景「三週後的晚上，我在家收到雨澄的訊息。」那一句之前播放。06 仍缺 MP4，播放時輪播 `06-B`／`06-C` 兩張分鏡。

其餘三個結局（`ending-decent`／`ending-soft-knife`／`ending-over-line`）目前沒有掛任何 cue，不在本輪規劃內。

完整 MV 不屬於主線過場：入口設定在 `property/music-video.json`，只在四個通關頁（`ending-decent`／`ending-soft-knife`／`ending-over-line`／`ending-true-finale`）由玩家自行點選；`file` 目前為 `null`，尚無驗收完成的成片，入口不顯示。成片交付後放在 `public/assets/music-video/` 並填入檔名即生效。

正式 MP4 缺失或未核准時，執行端應略過影片並繼續 canonical scene，不得回退到隔離舊片。
