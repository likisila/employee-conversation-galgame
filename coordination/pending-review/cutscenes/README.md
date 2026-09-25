# Pulled cutscene videos（暫時下架，等 ChatGPT 依新版人設重製）

這裡放的是**已經確認有問題、從 `public/assets/cutscenes/` 移出**的過場影片原檔。移出後遊戲不會播放它們——cue 本身不動（`file`／`trigger`／`scene` 仍對得上 `property/sora-cutscenes.json`），檔案缺檔時播放器照既有邏輯自動改播該 cue 的分鏡 placeholder（已逐張目視確認乾淨）。原檔沒有刪除，只是不再出貨，方便之後比對或重新剪輯。

## 確認的缺陷：人物設定是改版前的舊版

`docs/narrative/.../characters/zeng-yalin.md` 與 `property/image-prompts.md` 已把曾雅琳（HR）改版為「肩長淺冷灰棕髮、淺灰米色西裝外套、霧灰上衣、淺灰長褲、米白鞋」（`ChatGPT-20260917-0807` 定案），現有三張全身透明 PNG 與大多數分鏡圖都已經是這個新版。但 `01_meeting_invitation.mp4` 與 `02_layoff_notification.mp4` 這兩支影片是改版前生成的舊檔（`public/assets/cutscenes/README.md` 本來就記著「01、02 兩支 MP4 均未通過 v2 驗收，保留原檔待重製」），影片裡的雅琳畫成深色／黑髮、深色套裝，與現行設定不符。使用者實機複驗直接指出這點，逐秒截圖比對後確認。

## `00_final_documents.mp4`（原檔名 `01_meeting_invitation.mp4`）

- 移出時間：2026-09-25（Entry `Claude-20260925-2240`，見 `docs/ai-handoff/CLAUDE.md`）。
- 這支影片的敘事內容（雅琳把藍色文件夾送到予安桌上）本來就屬於「最終版」（s1-final-cut 之前）這個故事節點，先前一度被移去掛在 `meeting-invitation`／s2-invite 之前，本次已改掛回 `final-documents`／s1-final-cut 之前（檔名同步改為 `00_final_documents.mp4`）；影片本身仍因雅琳是舊版人設而下架。
- 移出後的播放行為：`final-documents` cue 補回分鏡 `00-A`、`00-C`（不含 `00-B`——那一格才會出現雅琳，先不用；`00-A`／`00-C` 只有予安與雨澄，沒有人物設定疑慮）。

## `02_layoff_notification.mp4`

- 移出時間：2026-09-25（Entry `Claude-20260925-2240`）。
- 移出後的播放行為：`layoff-notification` cue 的分鏡 `02-A`、`02-B`、`02-C` 都已逐張確認過——`02-A`／`02-B` 只有雨澄，`02-C` 的雅琳已經是新版人設（淺色髮、米色外套），三張都可以安心頂替，不需要再拿掉任何一格。

## 待辦

- 這兩支影片依新版人設重製後，直接把新檔放回 `public/assets/cutscenes/` 對應檔名即可自動恢復播放，不需要再改任何資料或程式。
