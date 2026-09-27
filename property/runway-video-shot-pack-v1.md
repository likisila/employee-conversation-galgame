# Runway 圖生影片逐鏡製作包 v1

更新：2026-09-27。這是 `cutscene-storyboard-v3.md` 的 Runway 專用執行層，只處理創作輸入與內容驗收，不是 API manifest。Runway runner、secret、task polling、下載、provenance、剪輯與 runtime 整合由 Claude 負責。

## 目前放行範圍

| 狀態 | 段落 | 原因 |
| --- | --- | --- |
| 可做單鏡 pilot | 00-B | 單一人物與紙本文件動作，可同時測身份、手部、道具與末態穩定性 |
| 靜態核准後可製作 | 00、02、04、06 | 影片在現行 cue 點增加新的空間、反應或時間橋資訊 |
| 創作暫停 | 07 | cue 前 L09 已完整敘述寄出、等待與不再寄第二封 |
| 創作暫停 | 08 | cue 前 L11–L14 已完整敘述深夜草稿、雅琳經過與關閉視窗 |
| 創作暫停 | 09 | cue 前 L09–L11 已完整敘述關門、留下紀錄與逐字刪稿 |

07–09 只有在使用者明確接受「有意的視覺回看」，或 canonical 敘述／影片功能重新拆分後才能生成。不得只因關鍵影格與 cue 已存在就消耗 credits。

## Runway 共用規格

- 以每鏡對應 PNG 作 image-to-video 第一幀；不要把多鏡合成一個生成任務。
- 1280×720，輸出取本表指定秒數。動作只做一次，前後各保留短暫穩定區供剪輯。
- Prompt 只描述可見運動、人物表演與攝影機；角色身份、服裝、構圖、道具與燈光由核准起始圖鎖定。
- Prompt 不使用角色姓名。Runway 不知道專案內的人名；人物一律以起始圖中可直接辨識的位置、外觀與正在接觸的道具描述，例如 `the standing light-haired woman holding the blue folder`。
- 不把負面限制塞入 Runway prompt。所有錯字、變形、新物件、錯位與身份漂移改由下方驗收欄否決。
- 全片無可理解人聲、旁白或配樂。環境聲在剪輯階段另處理。

## Pilot

### 00-B — 2 秒

- 起始圖：`public/assets/cutscenes/keyframes/runway-v3/00-B-v3.png`
- Runway prompt：`The standing light-haired woman calmly lowers the wide blue paper folder with both hands until it rests flat on the desk, then releases it. A restrained side-follow tracks only the short downward movement. Natural adult motion, quiet rainy-office stillness, and a stable hold on the folder resting on the desk.`
- 必須結束：文件夾完整平放桌面，雅琳雙手已鬆開。
- 否決：文件夾像發光平板／書本；紙頁厚度消失；雅琳臉、髮色或服裝漂移；手指融合；桌上新增物品；鏡頭推近或構圖跳動。

Pilot 通過門檻：身份、雙手、文件夾與桌面連續性全數通過；若只有其中一項失敗，只調整對應動作描述重試，不同時改模型、prompt 與輸入圖。

## 00 五點以前

### 00-A — 2 秒

- 起始圖：`public/assets/cutscenes/keyframes/runway-v2/00-A.png`
- Prompt：`The dark-haired woman at the keyboard continues working quietly while rain reflections move softly across the office. A very short lateral drift follows the desk edge. Her attention remains fixed on the screen and her posture stays composed.`
- 必須結束：雨澄仍專注工作，尚未察覺任何通知。
- 否決：抬頭、轉身、收到訊息、手錶換腕或變圓、人物／桌面新增物件。

### 00-B — 2 秒

使用上方 Pilot 定稿。

### 00-C — 2 秒

- 起始圖：`public/assets/cutscenes/keyframes/runway-v2/00-C.png`
- Prompt：`The seated brown-haired man's gaze settles on the dark-haired woman working in the distance. Focus shifts gently along his eyeline from the soft blue edge of the folder toward the distant woman, then holds the physical distance between them. Both remain restrained and still.`
- 必須結束：焦點留在兩人距離；予安沒有靠近，雨澄沒有察覺。
- 否決：任何人行走、對話或回望；文件夾進入清晰前景；臉或服裝漂移；大幅推鏡。

## 02 進入月球會議室

### 02-A — 2 秒

- 起始圖：`public/assets/cutscenes/keyframes/runway-v2/02-A.png`
- Prompt：`The dark-haired woman entering the meeting room takes one final small step through the doorway and releases the door handle. A short side-follow accompanies only her entry. She stops just outside the empty chair nearest her, empty-handed and composed.`
- 必須結束：雨澄停在自己的座位外側，手已離門把。
- 否決：手上新增電腦／文件／手機；直接坐下；門或空間地理改變；人物造型漂移。

### 02-C — 2 秒

- 起始圖：`public/assets/cutscenes/keyframes/runway-v2/02-C.png`
- Prompt：`A slow, minimal lateral camera move establishes the three adults seated on three sides of the round table. The blue folder stays centered, three water glasses remain in place, and the tablet stays beside the light-haired woman. Everyone holds a quiet procedural stillness.`
- 必須結束：三角座位與所有道具位置不變，仍未開始通知。
- 否決：任何人開口或大幅動作；平板換主人；水杯增減；座位、出口或資料夾漂移。

## 04 問題之後

### 04-B — 2 秒

- 起始圖：`public/assets/cutscenes/keyframes/runway-v2/04-B.png`
- Prompt：`The dark-haired woman holds the gaze of the brown-haired man seated opposite her after finishing her question. Her breathing is subtle and she raises her chin by only a fraction, then waits. The camera remains almost perfectly still.`
- 必須結束：雨澄仍在等待，沒有替玩家作答。
- 否決：說話、按錶、伸手、哭泣或誇張表情；手錶點亮；鏡頭推近。

### 04-C — 2 秒

- 起始圖：`public/assets/cutscenes/keyframes/runway-v2/04-C.png`
- Prompt：`The brown-haired man absorbs the question in silence. Focus shifts briefly from him to the light-haired woman's hands paused above the tablet, then returns to the brown-haired man. Their restrained posture and the meeting-room geometry remain steady.`
- 必須結束：焦點回到予安，雅琳仍停止輸入，玩家尚未作答。
- 否決：予安開口或點頭；雅琳打字；平板位移；人物表情或座位突變。

## 06 三週

### 06-A — 2 秒

- 起始圖：`public/assets/cutscenes/keyframes/runway-v3/06-A.png`
- Prompt：`With the meeting-room door already closed, the standing light-haired woman quietly slides the untouched third glass toward her own place. The seated brown-haired man remains still and does not turn toward the door. The camera stays fixed in the cool room.`
- 必須結束：第三杯水停在雅琳面前，予安仍坐著。
- 否決：雨澄重新出現；追門；喝水；杯數改變；平板、文件夾或座位漂移。

### 06-B — 2 秒

- 起始圖：`public/assets/cutscenes/keyframes/runway-v3/06-B.png`
- Prompt：`The light-haired woman at the doorway steps out and switches off the meeting-room light as she leaves. The brown-haired man remains seated in place. The room falls into a clean, quiet darkness and holds.`
- 必須結束：雅琳已離場、燈熄滅、予安仍未起身。
- 否決：予安跟隨；額外人物；不自然閃爍；房間配置改變；切黑前出現新光源。

### 06-C — 3 秒

- 起始圖：`public/assets/cutscenes/keyframes/runway-v3/06-C.png`
- Prompt：`In the quiet home interior at night, the dark phone screen lights with one small unreadable notification. The nearby hand stops before touching the phone. Hold the composition after the light appears.`
- 必須結束：手機亮起不可讀通知，手停在觸碰前。
- 否決：可讀訊息、咖啡店、第二人、拿起或解鎖手機、回覆動作、空間變成辦公室。

## 07–09 暫停鏡頭

以下 prompts 保留為創作草案，不能交給 runner，直到敘事重複問題定案。

| 鏡 | 秒 | 草案 prompt | 必須結束 |
| --- | ---: | --- | --- |
| 07-A | 3 | `The seated brown-haired man presses send once on the completed recommendation email. A small abstract status change confirms delivery, and he holds still.` | 信已寄出 |
| 07-B | 3 | `Later at the same desk, the seated brown-haired man moves both hands away from the keyboard while the inbox remains unchanged. The quiet frame holds.` | 沒有第二封信 |
| 08-A | 2 | `The cursor blinks in the seated brown-haired man's long unsent draft while a vacuum cleaner passes far behind him. He remains still.` | 草稿未送 |
| 08-B | 2 | `The light-haired woman carrying a tablet takes one step past the seated brown-haired man, pauses, and turns her head toward him while keeping the tablet tucked under her arm.` | 雅琳停步提醒界線 |
| 08-C | 3 | `The seated brown-haired man closes the message window with one click. The camera eases back slightly to reveal the quiet empty office.` | 視窗關閉、草稿未送 |
| 09-A | 2 | `The closed meeting-room door and the empty chair remain prominent while the seated brown-haired man and the light-haired woman hold still in a fixed wide composition. Rain and ventilation continue.` | 雨澄已離場 |
| 09-B | 2 | `The light-haired woman types one short abstract record line on the tablet while the brown-haired man remains still and softly out of focus.` | 紀錄留下 |
| 09-C | 2 | `The seated brown-haired man holds backspace until the short unsent draft field becomes empty, then his hand stops.` | 輸入框清空 |

## 每鏡共用驗收

任何一項成立即退件：

1. 角色身份、年齡感、髮色、服裝、識別證或雨澄手錶漂移。
2. 新增、刪除或換主人：藍色文件夾、雅琳平板、三杯水、手機、椅子或門。
3. 手指、手腕、臉、牙齒或肢體形變；兩幀間人物融化或替換。
4. 生成可讀文字、字幕、對話框、HUD、水印或具體訊息內容。
5. 做出第二個未授權動作，或在選擇前替玩家回答。
6. 末態沒有穩定保持至少可剪輯的一小段。
7. 攝影機大幅推近、旋轉、跳軸，或改變會議室出口與三角座位關係。

## 產出紀錄要求

每個候選檔都要保存：shot ID、start-frame 路徑與 hash、完整 prompt、model、duration、ratio、task ID、生成時間、下載時間、候選序號、驗收結果與退件原因。未填驗收結果的候選不得改名成正式段落 MP4。
