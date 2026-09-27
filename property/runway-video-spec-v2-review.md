# Runway 影片製作規格 v2 — 使用者審查稿

狀態：**停止生成。** 本規格只把 `cutscene-storyboard-v4-review.md` 轉成可驗收的影片製作約束；使用者核准前不得提交新 task。

所有起始圖只從穩定路徑 `public/assets/cutscenes/keyframes/current/` 取用；不得直接從 `runway-v2/`、`runway-v3/`、`v4-review/` 或退役索引選圖。同鏡號視覺替換沿用相同檔名，只有鏡號、時點、鏡序、片長契約或劇情設計變更才需要修改整合。

## 製作單位

- 一個正式 MP4 對應一個 runtime cue 與一個戲劇目的。
- 一個正式 MP4 可由多鏡組成，但所有鏡頭必須在同一段價值轉折內。
- 一個 Runway generation task 原則上只做一個連續鏡頭。提示要正面寫成 `single continuous shot`、起始可見狀態、唯一動作、攝影機行為、末態保持。
- 不要求模型直接生成完整 00／04／06 的多鏡成片。分鏡節奏與跨鏡因果由剪輯控制，避免模型自行補劇情、跳場或改人物。

## 片長規則

片長不是 keyframe 數量乘以固定秒數。每鏡必須包含：

1. 約 0.25–0.5 秒穩定起點，讓觀眾辨認空間與人物。
2. 一個完整可見動作或焦點轉移。
3. 約 0.5 秒穩定末態，供剪接與玩家理解。

目前審查長度：00 約 7 秒、04 約 5 秒、06 約 6 秒。若生成模型的最短 duration 較長，只能裁取穩定區，不能為填滿秒數增加動作。

## Cue 接合規格

| 段 | 進片前最後內容 | 出片後第一內容 | 影片必須補的缺口 | 段尾要求 |
| --- | --- | --- | --- | --- |
| 00 | content warning | s1 L01「16:40……」 | 文件已抵達而雨澄不知情 | 留在予安與雨澄的距離；不顯示通知 |
| 04 | s7 L08「她等著我回答」 | Choice 5 | 把一句沉默變成玩家承擔的壓力 | 所有人仍未回答；Choice 可立即出現 |
| 06 | ending-true L17「離開記得關燈」 | L18「三週後……」 | 結束公司時空並建立三週時間切 | 手機剛亮、尚未觸碰；文字負責揭露來源 |

若影片內容可以直接由 cue 前一句與 cue 後一句完整說完，且沒有新的感受、價值或過渡功能，該影片不製作。

## 逐鏡生成提示結構

正式 prompt 使用以下順序：

`Single continuous shot. [以位置／外觀／道具指認主體]. [唯一動作]. [唯一允許的固定鏡位、短橫移或焦點轉移]. [末態的正面描述] and the composition holds steadily.`

Prompt 不使用角色姓名、角色 ID、劇情背景說明、否定式禁止清單或下一鏡內容。模型只需要知道這一鏡能看見什麼、什麼在動、停在哪裡。

## 7 鏡 prompt 草案

這些 prompt 只供審查，不可送 connector。

### 00-A — 2.0 秒

`Single continuous shot. The dark-haired woman at the keyboard continues working quietly while rain reflections move softly across the office. A very short lateral drift follows the desk edge. Her attention remains fixed on the screen and the composition holds steadily.`

### 00-B — 2.5 秒

`Single continuous shot. The standing light-haired woman slowly lowers the wide blue paper folder with both hands until it rests flat on the desk, then releases it. A restrained side-follow tracks only the short downward movement. The folder and both released hands hold steadily.`

### 00-C — 2.5 秒

`Single continuous shot. The seated brown-haired man looks toward the dark-haired woman working in the distance. Focus travels gently along his eyeline from the soft blue edge of the folder to the distant woman. Their physical distance holds steadily.`

### 04-B — 2.5 秒

`Single continuous shot. The dark-haired woman in the shoulder-up close shot holds the gaze of the person seated opposite her after finishing her question. She takes one subtle breath and raises her chin by a fraction. Her gaze holds steadily toward the same off-screen position.`

### 04-C — 2.5 秒

`Single continuous shot. The seated brown-haired man remains silent. Focus moves briefly to the light-haired woman's hands resting motionless on the tablet keyboard, then returns to the seated man. Both visible adults remain still and the final focus holds steadily.`

### 06-B — 3.0 秒

`Single continuous shot. The light-haired woman at the meeting-room doorway steps out and switches off the room light. The brown-haired man remains seated. The room settles into clean darkness and the black frame holds steadily.`

### 06-C — 3.0 秒

`Single continuous shot in the quiet home interior at night. The dark phone screen lights with one small unreadable notification. The nearby hand stops before touching it. The illuminated phone and suspended hand hold steadily.`

## 剪輯規格

- 00：00-A 硬切 00-B；00-B 依藍色文件夾／視線方向匹配切 00-C。不得使用轉場特效。
- 04：04-B 視線反打到 04-C。兩鏡之間不插環境 establishing shot，不延長成另一場戲。
- 06：06-B 燈滅後保留短黑場，再直接切 06-C 手機仍暗的第一幀；手機亮起後接 runtime L18。
- 環境聲後製：00 雨聲與鍵盤；04 冷氣停下後的房間底噪；06 門、開關與家中夜間底噪。無可理解人聲、旁白、配樂或模型生成對白。
- 正式輸出：1280×720、24fps、H.264；整段輸出，不把單鏡檔命名成正式 cutscene 檔名。

## 段落級驗收

### 00

- 看完只知道文件已到、雨澄不知情、予安看見兩者距離。
- 不知道裁撤細節、不知道邀請內容、不進會議室。
- 片尾能直接接「16:40。我還在看雨澄剛交的設計稿」。

### 04

- 全片沒有新增情節，只增加問題後的壓力。
- 沒有人回答、暗示正確選項或替玩家表態。
- 片尾 Choice 5 出現時不感到時間或空間跳躍。

### 06

- 當天公司場景確實結束；唯一換場清楚讀成時間流逝。
- 三週後的訊息由雨澄主動，但影片不顯示內容、咖啡或原諒。
- 片尾能直接接「三週後的晚上，我在家收到雨澄的訊息」。

## 全案否決條件

- 單一生成鏡頭內自行切到第二地點、第二時間或第二段情節；06 的時空切只能在兩個獨立鏡頭剪輯時發生。
- 影片重播 cue 前文字已完成的動作，或提前演完 cue 後文字／選項。
- 為填滿 duration 增加走路、回頭、說話、拿新道具、第二次動作或情緒爆發。
- 人物、服裝、手、臉、道具、座位、出口、雨澄手錶或雅琳平板漂移。
- 出現可讀文字、字幕、HUD、訊息內容、浮動 UI、真人、3D、拼貼角色或水印。
- 沒有穩定末態，導致剪接只能截在動作中間。

## 核准後才做的事

1. 7 張候選 start frames 已依本版逐張重看，不需新增；判定見 `cutscene-keyframes-v4-audit.md`。
2. 只生成 00-A、00-B、00-C 的低成本候選並先剪成完整 00；不再用單鏡代表整段。
3. 使用者驗收完整 00 的播放時機、節奏與內容後，才製作 04 與 06。
4. 02、07、08、09 不保留「也許之後順便做」的生成狀態；若未來重啟，必須先提出全新的戲劇功能。
