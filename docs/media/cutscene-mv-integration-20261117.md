# 《最後一次簽名》過場與 MV 整合規格
日期：2026-11-17（台灣）。版本：v1，配置與實作交接；尚未接入遊戲或輸出剪輯成片。
基準：likisila/employee-conversation-galgame main @ d5ccc6463c827ebed00d5b692f148eb26c622fc8。

## 決策
保留已核准的 00 開場。第一階段僅新增一段會議室短過場候選，並規劃通關後的獨立 MV 入口。其餘 Higgsfield 影片先作 MV 素材庫；不為消耗素材增加過場。
前次提出雨窗直接當遊戲開場的建議，經目前 repository 核對後修正。

## 核對範圍與證據
- Higgsfield Assets 頁顯示 21 個影片；MCP 兩頁共 21 個 completed job，皆 Seedance 2.5。已核對全部生成描述與素材頁縮圖。
- 生成參數均 1280×720、16:9、8–19 秒，合計設定長度 236 秒。這是生成設定合計，不是歌曲長度或剪輯片長。
- 額外開啟六段實片並抽查畫面：c7df69d1、2b9f27d1、322e3d9d、d215a895、a6072512、65db5dfc。未完成 21 段逐格、全程動作或音軌驗收。
- 實片播放器讀值：c7df69d1 約 8.041667 秒；d215a895 約 11.041667 秒。其餘僅以生成設定記錄，不能據此填正式 EDL。
- generate_audio=false 表示未要求生成音訊，不等於已驗證檔案沒有音軌。本次未核對最新歌曲母帶、歌詞時間碼與完整 MV 成片。
- 21 段精確 ID、來源 URL、初篩用途見附 CSV；完整 prompt 見 JSON。

## 第一階段：一段共通會議過場
素材：d215a895-8a0b-44f2-85d7-0cc32158cd60。
劇情：property/scenes/s3-meeting.json。
位置：在雅琳說「我會說明文件與後續程序，也會記錄今天提供過哪些資訊。」之前播放；播完回到這句。
理由：此時三種邀請回應已匯流、雨澄已入座。scene 開頭仍在處理私訊回應，不能一進場就播會議。
實片觀察：雨澄在左、予安在右、雅琳在後景，圓桌、雨窗、草稿本與藍色資料夾可辨識；雅琳後景臉部模糊，適合作空間交代，避免剪成她的表情特寫。
建議試剪：來源 00:00.000–00:05.000，共約 5 秒。抽查約 0、4.9、8 秒及尾段，構圖從較近到較遠。這是試剪範圍，不是逐格核准時間碼；需完整播放該 5 秒驗收後才固定 in/out。
起始畫面：三人已坐定。結束畫面：仍在三人會議構圖，不在任何人手勢途中突然切斷。
音效：雨聲／室內環境音候選，依遊戲既有靜音偏好；不在此處播放完整主題曲。
實作建議 cue 名稱 meeting-establishing、輸出檔名 03_meeting_establishing.mp4 均屬提案，尚未新增或核准。不可只新增 cue 而漏掉內容 manifest 與一致性驗證。

## 其他五個關鍵候選
| 素材 | 決策 | 原因／已見畫面 |
|---|---|---|
| c7df69d1 雨窗轉頭 | MV 開頭；獨立片頭候選 | 開頭雨窗、後段雨澄轉頭，約中段仍有玻璃反射遮疊。保留完整動機，不取代已核准00。 |
| 2b9f27d1 走廊資訊差 | 優先 MV | 首段予安看文件、尾段雨澄在玻璃另一側。和 s2 私訊的空間動作不完全一致。 |
| 322e3d9d 合作回憶 | MV | 實片可見暖色共同草稿、尾段冷色視線分離；屬主觀回顧，沒有現成共通插入點。 |
| a6072512 文件反應 | MV；主線先不採用 | 中段文件有生成文字需檢查／遮除；s4 direct 分支明寫雨澄沒有低頭看資料夾，不能作共通反應。performance 分支也仍需逐句及實片驗收。 |
| 65db5dfc 雨窗留白 | MV 收尾候選 | 已見雨澄剪影、城市、右側大幅留白；可容納片名。不是三週後，不替代06。 |

## 現行三個 cue 的處理
| Cue | 目前錨點 | 本次決議 |
|---|---|---|
| final-documents | s1-final-cut / scene | 保留核准的00_final_documents.mp4 |
| boundary-question | s7-recommend-converge / choices | 保留既有分鏡備援；不把悲傷對視片段直接代入 |
| ending-true | ending-true / 「三週後的晚上，我在家收到雨澄的訊息。」之前 | 保留時間跳接設計與備援；雨窗不能冒充三週後 |

## MV 配置
完整歌曲搭配完整剪輯版；通關後讓玩家自行點選觀看，不強制整首播放。若有跨分支或尚未經歷的事件，入口先提示「含其他路線畫面」。
入口候選：ending-decent、ending-soft-knife、ending-over-line、ending-true-finale。不要把 ending-true 當TRUE END最終頁。
歌曲需要獨立音量及有聲播放意圖；播放器原有靜音偏好與自動播放行為應由 Claude 協調，不能讓使用者點MV後誤以為沒有聲音。
音樂剪接結構提案如下，僅代表視覺功能，不指定尚未核對的歌詞落點：

| 段落功能 | 素材候選 |
|---|---|
| 建立環境與資訊差 | 98530082、c7df69d1、2b9f27d1 |
| 昔日合作與當下會議 | 322e3d9d、d215a895、a6072512 |
| 視覺能量上升 | b00f1dc8、7395fea1、838e0c1a、404a054a |
| 角色立場與關係錯位 | bb3c1a4b、320ffc33、d3c5e71d、3b1b3ccd |
| 前行與回憶交錯 | c43ec02e、ae8cd4e0 |
| 收束與未完成的動作 | d3db0186、7d600585 |
| 最後回返 | b729ba0b、1c0705e4、65db5dfc |

這份順序依生成內容安排，尚未對母帶，不應把21段原長直接串起來就稱為完成MV。1c0705e4 的「林雨澄」紙張文字尤其須看實片確認，不能把 prompt 當正確文字證明。

## Claude 實作交接
現有 src/ui/cutscene.ts 已支援跳過、預設靜音、6秒載入逾時、影片失敗轉分鏡、完成回呼單次執行。StoryEngine 已保存看過的cue；無需重建系統。
parseCutsceneCues 每個scene僅容許一個cue，anchor可用scene、line精確matchText、choices，尚無獨立條件欄位。不能臆造條件格式或同場景再塞第二cue。
第一階段需求：
1. 依上述s3精確台詞錨點實作會議候選，保留原00、04、06。
2. 更新必要manifest及cue對應，保留影片失敗時的備援路徑。
3. MV入口與重播獨立於劇情cue，先接驗收過的成片；目前沒有本次已核對的完整MV交付檔。
4. 正式播放器使用受專案管理的影片檔／媒體位址；Higgsfield來源URL供取件追溯，本次未驗證其長期可用性。
5. 驗收三種邀請路線、播完／跳過、載入失敗、讀檔與重玩；確認不重複推進、不漏台詞，MV退出回原結局且不覆寫進度。
6. 依現有測試驗證schema與manifest一致性；確認行動裝置影片比例及聲音行為。

專案 AGENTS.md 與 docs/AI_ROLE_BOUNDARIES.md 將程式、UX及資產接入交由Claude；先前審查階段僅交付內容配置與整合規格；使用者隨後明確要求「你需要送PR」，本次因此提交文件PR。授權限本次分支、commit與PR；不修改長期角色規則，不包含程式整合、合併或部署。詳見附repo核對文件及原文來源。

## 素材管理
沿用 M27/組織報告 既有 Asset、Archive 資料夾。素材索引與來源紀錄置於Asset，整合規格置於組織報告。
本次沒有確認任何原素材應淘汰，因此不移動原素材至Archive；「不進主線」仍可用在MV。
沒有新增生成任務或花費生成Credits。

## 尚待成片驗收的項目
其餘15段全程畫面、六候選逐格剪點、角色線條／手部連續性、生成字樣、實際音軌及母帶同步。這些未驗證項目不可寫成已核准。當前可實作的是配置與入口需求，正式影片接入須使用驗收後輸出。

## 來源
- https://higgsfield.ai/asset/all
- https://github.com/likisila/employee-conversation-galgame/blob/main/property/cutscene-cues.json
- https://github.com/likisila/employee-conversation-galgame/blob/main/property/scenes/s3-meeting.json
- https://github.com/likisila/employee-conversation-galgame/blob/main/property/scenes/s4-notice.json
- https://github.com/likisila/employee-conversation-galgame/blob/main/src/ui/cutscene.ts

