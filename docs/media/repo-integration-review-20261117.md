# 《最後一次簽名》影片整合：程式與劇情核對

核對日期：2026-11-17。唯讀基準：GitHub `likisila/employee-conversation-galgame` 的 `main`，tree/commit SHA `d5ccc6463c827ebed00d5b692f148eb26c622fc8`。審查當時未修改 repository、cue、程式或路由；使用者隨後要求送 PR，本次提交的是文件與交接紀錄，未修改遊戲行為。

本文件已核對現行程式與劇情文字；Higgsfield 候選內容來自生成描述，尚不代表已觀看實片或確認可用剪接時間。

## 已確認設計（2026-11-17，優先於下方現況）

使用者已確認精簡：保留00與TRUE END的06時間橋，取消04獨立過場，不新增三人會議過場，MV通關後自行點選。02早在分鏡v4退役，前次把d215a895列為新增主線候選的建議已撤回。所有21段Higgsfield素材只作MV候選，不新增片頭或標題動畫。
下表是審查基準的runtime現況，尚未套用上述設計；Claude需停用boundary-question的MP4與分鏡fallback，不可保留五秒強制等待。詳見同目錄整合規格v2。

## 審查基準的現行過場（非新定案）

| Cue | 場景 | 播放錨點 | 現行素材 |
|---|---|---|---|
| final-documents | s1-final-cut | scene：進入場景前 | 00_final_documents.mp4，已核准正式影片 |
| boundary-question | s7-recommend-converge | choices：本場台詞讀完、Choice 5 出現前 | 04_boundary_question.mp4 尚缺，改播 04-B／04-C 分鏡 |
| ending-true | ending-true | line：「三週後的晚上，我在家收到雨澄的訊息。」之前 | 06_ending_true.mp4 尚缺，改播 06-B／06-C 分鏡 |

`public/assets/cutscenes/README.md` 明載既有 00 已核准；04、06 仍停止生成。檔案樹只有 00 的正式 MP4。舊隔離影片不得直接復用。

TRUE END 的最終通關場景是 `ending-true-finale`；`ending-true` 仍包含後日談並繼續路由。其他通關場景是 `ending-decent`、`ending-soft-knife`、`ending-over-line`。

## 六段 Higgsfield 素材用途（更新後）
| ID前綴 | 已確認用途 | 限制 |
|---|---|---|
| c7df69d1 | MV開頭候選 | 不取代00、不新增獨立片頭 |
| 2b9f27d1 | MV候選 | 不新增s2走廊過場 |
| d215a895 | MV候選；撤回主線五秒試剪 | s3已有入室、座位及反應，02在v4已退役 |
| a6072512 | MV候選 | 不作共通反應；與s4 direct分支動作衝突 |
| 322e3d9d | MV候選 | 合作回憶不插主線 |
| 65db5dfc | MV收尾候選 | 不能代替三週後06 |
沒有已核准的剪接時間碼或完成的MV成片。完整MV仍需母帶與實片驗收。

## 程式限制與可沿用功能

- `src/ui/cutscene.ts` 已有跳過、預設靜音及玩家偏好、6 秒載入逾時、MP4 失敗改分鏡、失敗續玩、完成回呼只執行一次。無需從零寫過場播放器。
- `src/engine/StoryEngine.ts` 保存看過／跳過的 cue。回到決策點不重置；重新開始才重置。
- `src/domain/schema.ts` 的 `parseCutsceneCues()` 每個 scene 只允許一個 cue；重複場景直接拋錯。
- cue 錨點只支援 `scene`、`line`（精確比對 `matchText`）、`choices`；cue 沒有獨立 conditions 欄位。分支限制不能靠臆造 JSON 欄位完成。
- `src/ui/render.ts` 處理 scene 進入、選項出現前及下一句前的過場。分支條件會改變可見行號，因此 line anchor 用文字比對。
- `render.ts` 的現行通關按鈕只有重新開始、回到決策點、案例分析。獨立 MV 入口、重播、音樂管理是 Claude 待實作項目，不能宣稱已存在。
- `property/sora-cutscenes.json` 仍是內容 manifest；cue ID 與 file 有現行測試的一致性要求。不能只貼外部 URL 就視為整合完成。
- `property/cutscenes.json` 的現行設定為 1280×720、24 fps、H.264、diegetic-only。MV 歌曲音訊及字幕用途應另訂，不能套用既有「影片無對白」假設。

## 專案角色規則：精確原文

來源 `AGENTS.md`：

> 在讀取、修改或審查任何專案檔案前，必須依序完整閱讀並遵守：
>
> 1. [docs/AI_ROLE_BOUNDARIES.md](docs/AI_ROLE_BOUNDARIES.md)
> 2. [docs/AI_HANDOFF.md](docs/AI_HANDOFF.md)
> 3. [docs/ai-handoff/CLAUDE.md](docs/ai-handoff/CLAUDE.md)
> 4. [docs/ai-handoff/CHATGPT.md](docs/ai-handoff/CHATGPT.md)

> GitHub 雖已恢復可用，使用者最新明確指示 ChatGPT（包含 Codex）可以唯讀查詢 GitHub，但所有遠端 Git 與會改變 GitHub 狀態的操作全部交由 Claude。

> 純審查、回答問題或其他沒有檔案變更的工作不需追加空交接或建立空 commit。

來源 `docs/AI_ROLE_BOUNDARIES.md`：

> ChatGPT 可以在既有資料結構中更新純內容欄位，但不得改變 schema、識別碼規則、條件、效果、路由、狀態轉移或任何會改變遊戲行為的欄位。

> Claude 負責所有遊戲相關程式碼開發與 UX，包括：
>
> - 原始碼、測試、建置、設定、依賴、工具腳本、CI/CD 與部署。
> - HTML、CSS、TypeScript、JavaScript，以及任何其他可執行或影響執行結果的檔案。
> - 遊戲引擎、資料 schema、驗證器、分支條件、效果、路由、存讀檔與資產載入／整合。
> - UX：流程、導覽、互動、輸入、回饋、動畫行為、響應式行為、無障礙、錯誤處理、效能與易用性。
> - 將 ChatGPT 提供的 UI 設計、圖片、影片與文案實作並整合進遊戲。

> ChatGPT 遇到程式碼或 UX 工作時，只能提供需求、設計規格或交接說明，不得直接修改。

適用結果：本次可完成影片內容驗收、素材配置與整合需求；播放器／cue 行為修改、MV 入口及部署交 Claude。本文件沒有執行該等修改。

已讀Claude最新交接：Claude-20261021-1330。本次設計交接為ChatGPT-20261117-1132。歷史紀錄 ChatGPT-20261021-2119 已撤回「結局分析須精確對齊簡報」的舊待辦，應保留既有分析內容與顯示方式。

## 來源

- https://github.com/likisila/employee-conversation-galgame/tree/d5ccc6463c827ebed00d5b692f148eb26c622fc8
- https://github.com/likisila/employee-conversation-galgame/blob/main/AGENTS.md
- https://github.com/likisila/employee-conversation-galgame/blob/main/docs/AI_ROLE_BOUNDARIES.md
- https://github.com/likisila/employee-conversation-galgame/blob/main/docs/AI_HANDOFF.md
- https://github.com/likisila/employee-conversation-galgame/blob/main/property/cutscene-cues.json
- https://github.com/likisila/employee-conversation-galgame/blob/main/property/cutscenes.json
- https://github.com/likisila/employee-conversation-galgame/blob/main/public/assets/cutscenes/README.md
- https://github.com/likisila/employee-conversation-galgame/blob/main/property/scenes/s1-final-cut.json
- https://github.com/likisila/employee-conversation-galgame/blob/main/property/scenes/s2-invite.json
- https://github.com/likisila/employee-conversation-galgame/blob/main/property/scenes/s3-meeting.json
- https://github.com/likisila/employee-conversation-galgame/blob/main/property/scenes/s4-notice.json
- https://github.com/likisila/employee-conversation-galgame/blob/main/property/scenes/s7-recommend-converge.json
- https://github.com/likisila/employee-conversation-galgame/blob/main/property/scenes/ending-true.json
- https://github.com/likisila/employee-conversation-galgame/blob/main/property/scenes/ending-true-finale.json
- https://github.com/likisila/employee-conversation-galgame/blob/main/src/ui/cutscene.ts
- https://github.com/likisila/employee-conversation-galgame/blob/main/src/ui/render.ts
- https://github.com/likisila/employee-conversation-galgame/blob/main/src/domain/schema.ts
- https://github.com/likisila/employee-conversation-galgame/blob/main/src/engine/StoryEngine.ts
