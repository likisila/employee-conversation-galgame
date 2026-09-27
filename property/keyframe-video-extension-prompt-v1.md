# 關鍵影格延伸影片 Prompt v1

用途：把 `public/assets/cutscenes/keyframes/current/<shot-id>.png` 當作**精確第 0 幀**，在任何支援 image-to-video／first-frame-to-video 的 AI 工具中延伸成一個連續鏡頭。本文件與平台無關；Runway、Kling、Veo、Seedance 或其他工具都使用同一套戲劇與攝影契約。

狀態：只提供生成文字，不代表任何鏡頭已獲生成授權。每次只上傳一張 current keyframe、生成一個 shot；不得要求模型直接完成跨鏡剪輯。

## 完整通用 Prompt

把方括號內容替換成該鏡資料後，整段貼入工具的主 prompt：

```text
Use the uploaded keyframe as the exact first frame at time 0. Continue forward from that image into one single continuous shot lasting [DURATION]. Do not recreate, reinterpret, restage, or transition into the starting image.

FIRST-FRAME LOCK: Preserve the exact identity, face, hairstyle, age, clothing, body proportions, hands, pose, props, furniture, object ownership, room geography, lighting direction, color palette, line work, painted texture, depth relationships, framing, aspect ratio, and illustration style visible in the supplied keyframe. Keep every stationary element stationary. The image is the factual source of truth; character names or outside story knowledge are not required.

VISIBLE SUBJECT AND START STATE: [IDENTIFY THE SUBJECT ONLY BY VISIBLE POSITION, APPEARANCE, AND PROP. STATE WHAT IS ALREADY TRUE IN FRAME 0.]

ONE ALLOWED ACTION: [DESCRIBE ONE COMPLETE PHYSICAL ACTION OR ONE FOCUS CHANGE. DO NOT ADD A SECOND BEAT.]

CAMERA CONTRACT: Hold completely still from [START HOLD]. From [MOVE START] to [MOVE END], perform exactly one [LOCKED CAMERA / PAN / TILT / LATERAL DOLLY / PHYSICAL DOLLY-IN / RACK FOCUS] toward [TARGET], moving [DIRECTION AND MAGNITUDE] with [CONSTANT SPEED OR EASING]. Stop all camera or focus movement at [STOP TIME]. [STATE WHETHER PAN, TILT, DOLLY, OPTICAL ZOOM, OR FOCUS CHANGE MUST BE ZERO.] Hold the final framing and focus from [END HOLD] through the last frame.

END STATE: [DESCRIBE THE EXACT VISIBLE FINAL POSE, PROP STATE, FOCUS PLANE, AND COMPOSITION THAT MUST HOLD FOR THE CUT.]

The shot remains in the same place and continuous moment. Preserve restrained natural adult motion and stable illustrated anatomy. No cut, transition, time jump, new location, new person, new object, extra action, dialogue, lip movement, readable text, subtitle, interface, watermark, identity drift, costume change, anatomy drift, hand deformation, prop transformation, camera shake, automatic reframing, or unrequested zoom.
```

## 短版 Prompt

工具字數很短時使用；仍需把該鏡的量化 camera block 貼進去：

```text
Treat the uploaded keyframe as exact frame 0 and extend it forward as one continuous [DURATION] shot. Preserve every visible identity, face, clothing, hand, prop, object owner, room position, lighting, framing and illustration style; do not redraw or reinterpret the start frame. [VISIBLE SUBJECT AND START STATE]. Only this action occurs: [ONE ACTION]. Camera: [START HOLD → ONE MEASURED CAMERA OR RACK-FOCUS MOVE WITH DIRECTION, MAGNITUDE, SPEED/EASING → END HOLD; STATE ALL ZERO MOVEMENTS]. End and hold on [EXACT END STATE]. Same place and moment; no cut, new event, new person/object, dialogue, text, UI, identity/anatomy drift, prop change, camera shake, auto-reframe or unrequested zoom.
```

## Negative prompt 欄位

若工具有獨立 negative prompt，主 prompt 最後一句的限制可移到此欄：

```text
cut, scene change, time jump, second action, new plot event, new person, duplicate person, new object, object removal, object ownership change, identity drift, face drift, hairstyle change, costume change, body proportion change, anatomy error, deformed hands, extra fingers, fused fingers, prop morphing, tablet replacing paper folder, readable text, subtitles, captions, logo, watermark, HUD, dialogue, speaking, lip movement, camera shake, handheld motion, auto reframing, unrequested pan, unrequested tilt, unrequested dolly, optical zoom, snap zoom, crash zoom, focus breathing, style change, live action, photorealism, 3D render
```

## 工具設定原則

- 模式選 image-to-video、first-frame 或 start-frame；不要選純 text-to-video。
- reference／image adherence 設高，stylization／creativity 設低或中低。
- 能關閉時，關閉 auto camera、auto cut、auto extend、dialogue、lip sync、字幕與生成音訊。
- 工具不支援秒數 timecode 時，把各節拍換成全片百分比；動作、相機與結尾 hold 的相對比例不變。
- 工具強制輸出較長影片時，延長起始或結尾 hold；不得增加第二個動作、第二次 camera move 或新情節。
- 工具支援 motion brush 時，只標記真正會動的手、文件、門／開關、手機亮光或環境雨影；不要把整個人物與背景都塗成運動區。

## 目前 7 鏡的填寫來源

| 鏡 | 上傳起始圖 | Duration | Action／camera／end-state 來源 |
| --- | --- | ---: | --- |
| 00-A | `public/assets/cutscenes/keyframes/current/00-A.png` | 2.0s | `runway-video-spec-v2-review.md` 的 00-A v2.1 prompt |
| 00-B | `public/assets/cutscenes/keyframes/current/00-B.png` | 2.5s | 同文件 00-B v2.1 prompt |
| 00-C | `public/assets/cutscenes/keyframes/current/00-C.png` | 2.5s | 同文件 00-C v2.1 prompt |
| 04-B | `public/assets/cutscenes/keyframes/current/04-B.png` | 2.5s | 同文件 04-B v2.1 prompt |
| 04-C | `public/assets/cutscenes/keyframes/current/04-C.png` | 2.5s | 同文件 04-C v2.1 prompt |
| 06-B | `public/assets/cutscenes/keyframes/current/06-B.png` | 3.0s | 同文件 06-B v2.1 prompt |
| 06-C | `public/assets/cutscenes/keyframes/current/06-C.png` | 3.0s | 同文件 06-C v2.1 prompt |

各鏡的精確 subject、action、camera timecode、幅度、easing 與 end state 以 [`runway-video-spec-v2-review.md`](runway-video-spec-v2-review.md) v2.1 為準；該內容雖保留原檔名，camera contract 與 7 個 prompt 本身是平台中立規格。

## 使用前檢查

1. 上傳的是 `current/` 中正確 shot ID，而不是版本快照或 retired 圖。
2. Prompt 只描述畫面內可辨識的外觀與位置，不使用角色姓名期待工具自行理解。
3. 只有一個人物／道具動作與一個主要攝影行為。
4. camera block 有起點、終點、幅度、速度／ease 與 end hold；刻意鎖鏡也寫明全部為 0。
5. end state 能直接供下一鏡硬切或接回 runtime，且沒有提前演下一句劇情。
