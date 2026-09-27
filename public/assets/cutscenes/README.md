# Cutscene videos

目前的創作與交付基準是 [分鏡表 v3](../../../property/cutscene-storyboard-v3.md)。它依 2026-09-27 的 canonical 劇情重新整理為 7 段、18 鏡、約 40 秒，採官方手繪／視覺小說插畫，不採真人或 3D。

製作順序固定為：核准關鍵影格 → image-to-video → 剪輯／轉檔 → 實機驗收。`property/sora-cutscenes.json` 現在是內容清單與提示詞來源；所有段落均為 `BLOCKED`、`TODO` 或 `DEPRECATED`，沒有任何一段可直接送進舊的一鍵生成流程。

## 目前素材狀態

- 既有關鍵影格 13 張中：6 張沿用、1 張重畫、6 張退出正式剪輯。
- 尚需新增 11 張關鍵影格；完成後正式組合共 18 張。
- 正式影片目前 0／7。
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
