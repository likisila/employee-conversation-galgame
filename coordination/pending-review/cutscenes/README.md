# Pulled cutscene videos（暫時下架，等 ChatGPT 重製）

這裡放的是**已經確認有問題、從 `public/assets/cutscenes/` 移出**的過場影片原檔。移出後遊戲不會再播放它們——引擎偵測到 MP4 缺檔會照既有的「缺檔即略過」策略處理：這段 cue 若有分鏡 placeholder 就改播分鏡，沒有就直接無縫進入對應場景，兩種都不會讓玩家看到有問題的畫面。原檔案沒有刪除，只是不再出貨，方便之後比對或重新剪輯。

## `01_meeting_invitation.mp4`

- 移出時間：2026-09-25（Entry `Claude-20260925-2235`，見 `docs/ai-handoff/CLAUDE.md`）。
- 移出原因：使用者實機／上線後複驗回報這支影片有問題，明確指出不是道具畫成平板那件事（Claude 最初的判斷有誤，已由使用者更正）。實際缺陷內容待使用者進一步指出後補上；本檔先移出讓玩家看不到，不代表已經確認根本原因。
- 移出後的播放行為：`property/cutscene-cues.json` 的 `meeting-invitation` cue 本身沒有改動，仍宣告這支檔名；因為檔案現在真的不存在，`<video>` 會直接 404 並觸發既有的分鏡 fallback，改播 `01-A`、`01-B` 兩張分鏡圖（`public/assets/cutscenes/storyboard/`）——這兩張已經逐張目視確認過，沒有道具或人體結構問題。
- 待辦：`public/assets/cutscenes/README.md` 第 7 行本來就記著「01、02 兩支 MP4 均未通過 v2 驗收，保留原檔待重製」，這支只是先移出不再出貨；重製通過驗收後把新檔放回 `public/assets/cutscenes/01_meeting_invitation.mp4` 即可自動恢復播放，不需要再改任何資料或程式。
