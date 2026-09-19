# Cutscene videos

新版採官方手繪／視覺小說插畫過場，不採真人或 3D。逐鏡起始影格、Runway 動作提示詞與驗收規格見 [分鏡表 v2](../../../property/cutscene-storyboard-v2.md)；`property/sora-cutscenes.json` 保留既有 ID、檔名與 trigger，創作提示詞同步 v2。

先由內建 imagegen 製作起始關鍵影格，再把核准圖片交給 Runway 生成影片。新圖位置 `keyframes/runway-v2/`，目前圖片 13／26 已生成、第一批待使用者驗收，新版影片 0／9。預覽與檢查記錄見 [第一批驗收頁](keyframes/runway-v2/REVIEW.md)。原生輸出 1672×941，最終影片精確 16:9 的交付轉換由 Claude 處理。第一批 00–04 的 13 張驗收後才製作第二批 06–09。

本機現有 01、02 兩支 MP4 均未通過 v2 驗收，保留原檔待重製；其餘 7 支缺檔。02／04 的新敘事時序須由 Claude 調整掛載後才能替換，詳見分鏡表。manifest 的 READY 是歷史契約標記，不能視為新影片已交付。

舊版以背景、角色立繪與對話卡合成的 GAL GAME fallback 已移除。正式 MP4 尚未生成或檔案缺失時，執行端必須略過影片並直接進入對應 canonical scene，不得回退到舊版影片。
