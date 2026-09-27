# Runway 影片製作規格 v2.2 — 04／06 審查稿；00 歷史規格

狀態：**00 已採用使用者提供的正式成片，不得重跑；04、06 停止生成。** 本文件的 00-A／B／C 內容只保留為歷史與未來明確重製時的參考。

所有起始圖只從穩定路徑 `public/assets/cutscenes/keyframes/current/` 取用；不得直接從 `runway-v2/`、`runway-v3/`、`v4-review/` 或退役索引選圖。同鏡號視覺替換沿用相同檔名，只有鏡號、時點、鏡序、片長契約或劇情設計變更才需要修改整合。

需要在 Runway 以外的 image-to-video 工具製作尚未核准的 04、06 時，可到 [`keyframe-video-extension-prompt-v1.md`](keyframe-video-extension-prompt-v1.md) 複製對應鏡號的完整 Main prompt 與 Negative prompt。00 已定稿，不得因本文件仍保留 prompt 而重新生成。

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
| 00 | content warning | s1 L01「16:40……」 | 雅琳把文件交到予安桌上，與雨澄擦身離開，而雨澄仍不知情 | 留在予安與雨澄的距離；不顯示通知 |
| 04 | s7 L08「她等著我回答」 | Choice 5 | 把一句沉默變成玩家承擔的壓力 | 所有人仍未回答；Choice 可立即出現 |
| 06 | ending-true L17「離開記得關燈」 | L18「三週後……」 | 結束公司時空並建立三週時間切 | 手機剛亮、尚未觸碰；文字負責揭露來源 |

若影片內容可以直接由 cue 前一句與 cue 後一句完整說完，且沒有新的感受、價值或過渡功能，該影片不製作。

## 逐鏡生成提示結構

正式 prompt 使用以下順序：

`Single continuous shot. [以位置／外觀／道具指認主體]. [起始停留]. [唯一動作]. [攝影機或焦點的種類、起訖時間、方向、幅度、速度與緩動]. [結尾停留與末態].`

Prompt 不使用角色姓名、角色 ID、劇情背景說明或下一鏡內容。模型只需要知道這一鏡能看見什麼、什麼在動、攝影機如何動、停在哪裡。必要的防漂移限制只寫與本鏡直接相反的誤動作，不堆疊無關禁止清單。

## 攝影機運動契約

每一鏡都必須逐項寫明；「gentle」「slow」「restrained」「brief」只能作質感修飾，不能代替數值：

1. **運動種類**：locked camera、lateral dolly、tilt、pan、dolly-in/out、optical zoom 或 rack focus，只能選一個主要攝影行為。rack focus 不算 zoom。
2. **起始停留**：明寫 0 秒到幾秒完全鎖定，讓起始影格可辨識。
3. **運動窗**：明寫從幾秒開始、到幾秒停止；不得讓模型自行決定整段持續移動。
4. **方向與幅度**：空間移動以畫面寬／高百分比或角度表示；zoom 以主體在畫面中的尺寸變化表示；focus 需寫起點與終點平面。
5. **速度與緩動**：constant speed、ease-in/ease-out 或 ease-out，並寫出緩動所占時間。
6. **結尾停留**：運動停止後至少保留 0.5 秒；不得在最後一格仍移動。
7. **零運動也要寫**：若戲劇功能需要靜止，明寫 `locked camera for the entire shot; zero pan, tilt, dolly or zoom`，不能省略攝影機欄位。

若實際生成片長與請求不同，依全片比例縮放上述時間點；不得為填滿或補足時間新增第二個攝影動作。除非逐鏡規格明寫 `optical zoom`，全案預設禁止 zoom；短推近一律指 physical dolly-in。

## 7 鏡攝影機時間表

| 鏡 | 起始停留 | 攝影機／焦點運動 | 速度與幅度 | 結尾停留 |
| --- | --- | --- | --- | --- |
| 00-A 2.5s | 0.00–2.50s | locked camera for entire shot | 0% pan／tilt／dolly／zoom；文件夾在固定空間內垂直下降 | 1.70–2.50s locked end state |
| 00-B 2.0s | 0.00–2.00s | locked medium-wide for entire shot | 0% pan／tilt／dolly／zoom；兩人以相反方向穿越固定走道構圖 | 1.45–2.00s locked separation |
| 00-C 2.5s | 0.00–0.35s locked，焦點在前景藍邊 | 0.35–1.55s rack focus 到遠處工作的女性 | 前後各 0.20s ease；攝影機位置與焦距不變，無 zoom | 1.55–2.50s focus locked |
| 04-B 2.5s | 0.00–2.50s | locked camera for entire shot | 0% pan／tilt／dolly／zoom；只允許人物呼吸與極輕抬下巴 | 全鏡皆為 hold |
| 04-C 2.5s | 0.00–0.35s locked，焦點在沉默男性 | 0.35–0.80s rack focus 到平板上的靜止雙手；0.80–1.15s hold；1.15–1.65s rack focus 回男性 | 兩次焦點轉移均 ease-in/out；攝影機位置與焦距不變，無 zoom | 1.65–2.50s focus locked |
| 06-B 3.0s | 0.00–3.00s | locked wide composition for entire shot | 0% pan／tilt／dolly／zoom；讓離場與關燈在固定空間內完成 | 關燈後黑畫面至少 hold 0.60s |
| 06-C 3.0s | 0.00–0.45s locked | 0.80–2.15s physical dolly-in toward the phone | 前 0.20s ease-in、後 0.30s ease-out；手機寬度最多增加約 3%；無 optical zoom | 2.15–3.00s locked |

## 7 鏡 prompt 草案

以下為 v2.2 審查稿；使用者逐鏡授權前不可送 connector。00-A、00-B 的 direct prompts 已按新版動作寫好，但必須等同名關鍵影格替換並核准後才能使用；2026-09-27 的 00-A／B 影片已因劇情修正失效，不能作新版比較基準。00-C 仍只保留供使用者審查。

### 00-A — 2.5 秒

`Single continuous shot. At the near side of the seated brown-haired man's desk, the standing light-haired woman holds a closed wide blue paper folder horizontal and parallel to the desktop, only five to eight centimeters above it; the dark-haired woman remains working in deep background. Use a completely locked camera from 0.00 through 2.50 seconds with zero pan, tilt, dolly or zoom. Hold the exact starting state through 0.30 seconds. From 0.30 to 1.70 seconds, the light-haired woman lowers the closed folder straight down without rotation until it rests fully flat on the desk, then releases it. The distant working woman does not turn. Hold the folder, released hands, desk geography and background woman completely still from 1.70 through 2.50 seconds.`

### 00-B — 2.0 秒

`Single continuous shot in the same rainy-night open office aisle. The empty-handed light-haired woman has just left the desk area and walks in one direction while the dark-haired woman approaches from the opposite direction; they are about to pass shoulder to shoulder. Use a locked medium-wide camera from 0.00 through 2.00 seconds with zero pan, tilt, dolly, rack focus or zoom. Hold the starting positions through 0.25 seconds. From 0.25 to 1.45 seconds, both women continue at the same restrained natural walking speed and pass each other once without stopping, touching, turning, speaking or making eye contact. From 1.45 through 2.00 seconds, the light-haired woman continues out of frame while the dark-haired woman continues toward the work area. Preserve their identities, office geography and opposite travel directions.`

### 00-C — 2.5 秒

`Single continuous shot. The seated brown-haired man remains still and looks toward the dark-haired woman working in the distance. Keep the camera position, framing and focal length completely locked for the entire shot. Hold focus on the soft blue folder edge in the foreground from 0.00 to 0.35 seconds. From 0.35 to 1.55 seconds, perform one smooth rack focus along his eyeline to the distant working woman, with a 0.20-second ease at both ends. Hold focus on her from 1.55 through 2.50 seconds. No pan, tilt, dolly or zoom; their physical distance never changes.`

### 04-B — 2.5 秒

`Single continuous shot. The dark-haired woman in the shoulder-up close shot holds the gaze of the person seated opposite her after finishing her question. The camera remains completely locked from 0.00 through 2.50 seconds: zero pan, tilt, dolly or zoom. She takes one subtle breath and raises her chin by a fraction between 0.55 and 1.35 seconds, then becomes still. Her gaze holds toward the same off-screen position through the final frame.`

### 04-C — 2.5 秒

`Single continuous shot. The seated brown-haired man remains silent while the light-haired woman's hands rest motionless on the tablet keyboard. Keep camera position, framing and focal length locked throughout. Hold focus on the seated man from 0.00 to 0.35 seconds; rack focus to the still hands from 0.35 to 0.80 seconds with ease-in and ease-out; hold there until 1.15 seconds; rack focus back to the man from 1.15 to 1.65 seconds; then hold through 2.50 seconds. No pan, tilt, dolly or zoom. Both adults remain still.`

### 06-B — 3.0 秒

`Single continuous shot. The light-haired woman at the meeting-room doorway steps out and switches off the room light while the brown-haired man remains seated. Use one locked wide composition from 0.00 through 3.00 seconds: zero pan, tilt, dolly or zoom. Her exit and the switch-off occur within the fixed geography. Complete the light change by 2.40 seconds and hold a clean black frame without camera movement for at least the final 0.60 seconds.`

### 06-C — 3.0 秒

`Single continuous shot in the quiet home interior at night. Hold the camera locked from 0.00 to 0.45 seconds. The dark phone screen lights with one small unreadable notification and the nearby hand stops before touching it. From 0.80 to 2.15 seconds, make one physical dolly-in toward the phone so its width increases by no more than three percent, using a 0.20-second ease-in and a 0.30-second ease-out. Stop completely at 2.15 seconds and hold the illuminated phone and suspended hand through 3.00 seconds. No optical zoom, pan or tilt.`

## 剪輯規格

- 00：00-A 依雅琳離場方向硬切 00-B；00-B 依雨澄前進方向與空間軸線硬切 00-C。不得使用轉場特效。
- 04：04-B 視線反打到 04-C。兩鏡之間不插環境 establishing shot，不延長成另一場戲。
- 06：06-B 燈滅後保留短黑場，再直接切 06-C 手機仍暗的第一幀；手機亮起後接 runtime L18。
- 環境聲後製：00 雨聲與鍵盤；04 冷氣停下後的房間底噪；06 門、開關與家中夜間底噪。無可理解人聲、旁白、配樂或模型生成對白。
- 正式輸出：1280×720、24fps、H.264；整段輸出，不把單鏡檔命名成正式 cutscene 檔名。

## 段落級驗收

### 00

- 看完只知道雅琳已把文件交到予安桌上、她與雨澄擦身離開、雨澄仍不知情、予安看見這個距離。
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

1. 不重製、重跑、重剪或替換已核准的 00，除非使用者另行明確要求。
2. 04、06 維持停止生成，等待使用者逐段核准。
3. 02、07、08、09 不保留「也許之後順便做」的生成狀態；若未來重啟，必須先提出全新的戲劇功能。
