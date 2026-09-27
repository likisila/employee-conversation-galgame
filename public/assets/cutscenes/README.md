# Cutscene videos

**目前停止生成。** 待使用者審查的創作方案是 [分鏡表 v4](../../../property/cutscene-storyboard-v4-review.md) 與 [Runway 規格 v2](../../../property/runway-video-spec-v2-review.md)。新稿從實際播放點前後文本重新判斷，只暫留 00、04、06 共 3 段／7 鏡／約 18 秒；核准前不改 runtime cue、不生成、不部署。

最新完整影格集合與未來穩定路徑是 [`keyframes/current/`](keyframes/current/)；7 張現役候選只用鏡號命名。同鏡號換圖直接替換同一檔名，不需再改 cue 或程式路徑。`runway-v2/`、`runway-v3/`、`v4-review/` 都是版本快照；18 張退役／被取代影格逐檔列在 [`v4-review/retired/README.md`](keyframes/v4-review/retired/README.md)。舊版本路徑暫留只為一次性 runtime 遷移，不再用資料夾名稱判斷現役。

製作順序固定為：核准關鍵影格 → image-to-video → 剪輯／轉檔 → 實機驗收。`property/sora-cutscenes.json` 現在是內容清單與提示詞來源；所有段落均為 `BLOCKED`、`TODO` 或 `DEPRECATED`，沒有任何一段可直接送進舊的一鍵生成流程。

## 目前素材狀態

- 既有關鍵影格 13 張中：6 張沿用、1 張重畫、6 張退出正式剪輯。
- 00-B 重畫與 11 張新結局影格已完成，存於 `keyframes/runway-v3/`；搭配 6 張沿用圖，正式 18 張起始影格已齊。
- `property/cutscene-cues.json` 已完成 7 段 scene／line／choices anchor 接線；分鏡 fallback 已指向 18 張正式起始影格。
- 07、08、09 雖已接線，但影片動作會完整重演緊接在前的結局敘述，目前列為創作暫停；不因 cue 存在就送生成。
- 正式影片目前 0／3；00-B 單鏡試跑不構成正式 00 段，已因規格層級錯誤退件。
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
