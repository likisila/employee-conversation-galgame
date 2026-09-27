# Cutscene videos

**00 已核准並部署為本地正式素材；04、06 仍停止生成。** 使用者於 2026-09-28 指定提供的 10 秒 MP4 作為 [`00_final_documents.mp4`](00_final_documents.mp4)。既有 `final-documents` cue 已使用這個檔名，不需修改 runtime。

最新完整影格集合與未來穩定路徑是 [`keyframes/current/`](keyframes/current/)；00-A／B／C 現在只保留為未來重製參考，不是核准成片的組成檔。04、06 的 4 張影格仍可供審查。`runway-v2/`、`runway-v3/`、`v4-review/` 都是版本快照。

04、06 的製作順序仍是：核准關鍵影格 → image-to-video → 剪輯／轉檔 → 實機驗收。00 已直接採用使用者核准成片，不再進入生成流程。

## 目前素材狀態

- 既有關鍵影格 13 張中：6 張沿用、1 張重畫、6 張退出正式剪輯。
- 先前的 00-B 重畫與 11 張結局影格保留在 `keyframes/runway-v3/` 作版本快照；2026-09-28 劇情修正後，舊 00-A／B 不再符合現役分鏡。
- `property/cutscene-cues.json` 已完成 7 段 scene／line／choices anchor 接線；分鏡 fallback 已指向 18 張正式起始影格。
- 07、08、09 雖已接線，但影片動作會完整重演緊接在前的結局敘述，目前列為創作暫停；不因 cue 存在就送生成。
- 正式影片目前 1／3：00 已核准；04、06 尚未製作。舊 00-A／B 與其完整合併候選不得部署或挪作新版素材。
- `keyframes/runway-v2/` 只是沿用舊路徑的素材池，不代表仍採 v2 分鏡；逐張決議見 [關鍵影格複審](keyframes/runway-v2/REVIEW.md)。
- 隔離區的舊 MP4 只供比對，不得回放或直接復用，詳見 [pending-review 說明](../../../coordination/pending-review/cutscenes/README.md)。

## 重要時序

v3 不再把所有影片都放在場景進入前。四段需要新的場內／結尾插入點：

- `layoff-notification`：s3 L15 後、L16 前。
- `boundary-question`：`s7-recommend-converge` L08 後、Choice 5 前。
- `ending-true`：L17 後、L18 前。
- 另外三個結局：各自最後一句敘事後、標題卡前。

這些掛載點尚待 Claude 依 v3 技術交接實作；在完成前不得用舊 cue 位置代替。

正式 MP4 缺失或未核准時，執行端應略過影片並繼續 canonical scene，不得回退到隔離舊片。
