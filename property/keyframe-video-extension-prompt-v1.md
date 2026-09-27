# 關鍵影格延伸影片 Prompt v1.1 — 逐鏡直接貼上版

本文件提供 7 個完整、平台中立的 image-to-video Prompt。**不需要替換任何文字。** 找到鏡號，上傳指定的 `current` PNG，設定列出的片長與 16:9，然後直接複製 Main prompt。工具有獨立 Negative prompt 欄位時，再複製同鏡的 Negative prompt。

00 已由使用者提供並核准的 10 秒單一連續成片取代。`00-A`、`00-B`、`00-C` 以下內容只保留為未來明確要求重製時的歷史參考，**不得用來重跑目前的 00**。04、06 的 4 鏡仍可供審查。

共同設定：image-to-video／first-frame 模式、16:9、reference adherence 高、stylization 低或中低、auto camera／auto cut／auto extend／dialogue／lip sync／字幕／生成音訊關閉。每次只生成一鏡。

## 00-A

- 上傳：`public/assets/cutscenes/keyframes/current/00-A.png`
- 狀態：**BLOCKED — REPLACE KEYFRAME FIRST**
- 片長：2.5 秒

### Main prompt

```text
Use the uploaded image as the exact first frame at time 0 and extend it forward into one single continuous 2.5-second illustrated shot. Do not recreate, reinterpret, restage, or transition into the starting image. Preserve the exact light-haired woman standing beside Zhou Yu-an's desk, the closed wide blue paper folder held horizontally five to eight centimetres above his desktop, Zhou Yu-an's established desk position, the dark-haired woman working in the deep background, all three identities, faces, hairstyles, clothing, body proportions, office geography, furniture, rainy-night lighting, color palette, line work, painted texture, depth, framing, 16:9 composition, and every visible object from the supplied image.

The light-haired woman lowers the closed blue paper folder straight down onto Zhou Yu-an's desk and releases it. This is the only foreground action. The folder remains parallel to the desktop, keeps its cover, spine, and visible paper thickness, and never opens or rotates. The dark-haired woman continues working in the deep background without looking up, and Zhou Yu-an does not reach for the folder. Keep the camera position, framing, and lens completely locked from 0.00 through 2.50 seconds with zero pan, tilt, dolly, optical zoom, focus pull, camera shake, or automatic reframing. Begin the downward movement at 0.30 seconds, complete the placement and release by 1.70 seconds, and hold the final state completely still through 2.50 seconds.

End with the folder lying fully flat on Zhou Yu-an's desk, the light-haired woman's hands released, and the dark-haired woman still unaware in the deep background. The final frame must be stable and usable for a hard cut to the office aisle.
```

### Negative prompt

```text
cut, transition, scene change, time jump, second action, folder placed on the wrong desk, folder opening, folder rotating, folder lifted again, tablet, screen, glowing device, disappearing paper thickness, dark-haired woman looking up, dark-haired woman turning around, Zhou Yu-an reaching for the folder, light-haired woman walking away before the cut, new person, duplicate person, missing person, new object, missing object, identity drift, face drift, hairstyle change, costume change, body proportion change, anatomy error, deformed hands, extra fingers, fused fingers, readable text, subtitles, captions, logo, watermark, HUD, dialogue, speaking, lip movement, camera shake, handheld motion, auto reframing, pan, tilt, dolly, push-in, pull-back, optical zoom, snap zoom, rack focus, style change, live action, photorealism, 3D render
```

## 00-B

- 上傳：`public/assets/cutscenes/keyframes/current/00-B.png`
- 狀態：**BLOCKED — REPLACE KEYFRAME FIRST**
- 片長：2.0 秒

### Main prompt

```text
Use the uploaded image as the exact first frame at time 0 and extend it forward into one single continuous 2.0-second illustrated shot. Do not recreate, reinterpret, restage, or transition into the starting image. Preserve the exact empty-handed light-haired woman and dark-haired woman approaching each other from opposite directions in the same office aisle, both identities, faces, hairstyles, clothing, body proportions, walking directions, their initial separation, office geography, furniture, rainy-night lighting, color palette, line work, painted texture, depth, locked medium-wide framing, 16:9 composition, and every visible object from the supplied image. Neither woman carries the blue folder.

Both women continue at a restrained natural walking pace and pass each other exactly once. They do not slow down, stop, touch, speak, acknowledge each other, or make eye contact. The light-haired woman continues away from Zhou Yu-an's desk and exits along her established direction; the dark-haired woman continues toward the work area. Keep the camera position, framing, and lens completely locked from 0.00 through 2.00 seconds with zero pan, tilt, dolly, optical zoom, focus pull, camera shake, or automatic reframing. Begin visible walking by 0.25 seconds, let their shoulder lines cross at approximately 1.20 seconds, and hold the clean separation from 1.45 through 2.00 seconds.

End after the single pass-by, with the women moving apart in their original directions and no exchange between them. The final frame must be stable and usable for a hard cut to Zhou Yu-an's eyeline shot.
```

### Negative prompt

```text
cut, transition, scene change, time jump, second action, blue folder in either woman's hands, any carried document, stopping, slowing to converse, collision, touching, turning toward each other, eye contact, greeting, nodding, speaking, lip movement, swapped walking directions, walking together, following, new person, duplicate person, missing person, new object, missing object, identity drift, face drift, hairstyle change, costume change, body proportion change, anatomy error, deformed hands, extra fingers, fused fingers, readable text, subtitles, captions, logo, watermark, HUD, camera shake, handheld motion, auto reframing, pan, tilt, dolly, push-in, pull-back, optical zoom, snap zoom, rack focus, style change, live action, photorealism, 3D render
```

## 00-C

- 上傳：`public/assets/cutscenes/keyframes/current/00-C.png`
- 片長：2.5 秒

### Main prompt

```text
Use the uploaded image as the exact first frame at time 0 and extend it forward into one single continuous 2.5-second illustrated shot. Do not recreate, reinterpret, restage, or transition into the starting image. Preserve the exact seated brown-haired man in the foreground, the dark-haired woman working at her keyboard in the distance, both identities, faces, hairstyles, clothing, body proportions, poses, their physical distance, the soft blue edge of the paper folder in the foreground, workstation positions, rainy-night office geography, lighting, color palette, line work, painted texture, depth, framing, 16:9 composition, and every visible object from the supplied image.

The seated brown-haired man remains still and continues looking toward the distant dark-haired woman while she continues quiet work without looking back. Keep the camera position, framing, lens focal length, and physical distance completely locked for the entire shot. Hold focus on the soft blue folder edge in the foreground from 0.00 to 0.35 seconds. From 0.35 to 1.55 seconds, perform exactly one smooth rack focus along his existing eyeline from the foreground folder edge to the distant working woman, with a 0.20-second ease at both ends. Hold focus on the distant woman from 1.55 through 2.50 seconds. This is a focus pull only, not a zoom or camera move.

End with focus resting on the distant working woman while the seated man, both character positions, the foreground folder edge, and the office composition remain unchanged. The final frame must be stable and usable for a hard cut. No one approaches, turns, speaks, or begins a new action.
```

### Negative prompt

```text
cut, transition, scene change, time jump, second action, woman looking back, man standing, man approaching, characters moving closer, folder becoming sharp or changing form, new person, duplicate person, new object, missing object, object ownership change, identity drift, face drift, hairstyle change, costume change, body proportion change, anatomy error, deformed hands, readable text, subtitles, captions, logo, watermark, HUD, dialogue, speaking, lip movement, camera shake, handheld motion, auto reframing, pan, tilt, dolly, push-in, pull-back, optical zoom, snap zoom, focus breathing after focus settles, style change, live action, photorealism, 3D render
```

## 04-B

- 上傳：`public/assets/cutscenes/keyframes/current/04-B.png`
- 片長：2.5 秒

### Main prompt

```text
Use the uploaded image as the exact first frame at time 0 and extend it forward into one single continuous 2.5-second illustrated shot. Do not recreate, reinterpret, restage, or transition into the starting image. Preserve the exact dark-haired woman in the shoulder-up close shot, her face, hairstyle, clothing, body proportions, gaze direction toward the same off-screen seated person, background, meeting-room geography, lighting, color palette, line work, painted texture, depth, framing, 16:9 composition, and every visible object from the supplied image. Do not invent hands or a watch outside the frame.

The dark-haired woman holds the same unwavering gaze after finishing her question. The camera remains completely locked from 0.00 through 2.50 seconds with zero pan, tilt, dolly, optical zoom, focal-length change, focus pull, camera shake, or automatic reframing. Between 0.55 and 1.35 seconds, she takes one subtle natural breath and raises her chin by only a fraction, then becomes still. This is the only action.

End with her gaze fixed on the same off-screen position, her expression restrained, and the original composition unchanged. Hold the stable final pose through the last frame so the next eyeline-reverse shot can hard cut cleanly. She does not answer or withdraw the question.
```

### Negative prompt

```text
cut, transition, scene change, time jump, second action, speaking, asking the question again, answer, nodding, apology, smile, emotional outburst, looking away, invented hands, invented watch, glowing watch, new person, duplicate person, new object, missing object, identity drift, face drift, hairstyle change, costume change, body proportion change, anatomy error, readable text, subtitles, captions, logo, watermark, HUD, dialogue, lip movement, camera shake, handheld motion, auto reframing, pan, tilt, dolly, push-in, pull-back, optical zoom, snap zoom, rack focus, style change, live action, photorealism, 3D render
```

## 04-C

- 上傳：`public/assets/cutscenes/keyframes/current/04-C.png`
- 片長：2.5 秒

### Main prompt

```text
Use the uploaded image as the exact first frame at time 0 and extend it forward into one single continuous 2.5-second illustrated shot. Do not recreate, reinterpret, restage, or transition into the starting image. Preserve the exact seated brown-haired man, the light-haired woman, her two hands already resting motionless on the tablet keyboard, both identities, faces, hairstyles, clothing, body proportions, poses, three water glasses, tablet ownership, seating positions, meeting-room geography, lighting, color palette, line work, painted texture, depth, framing, 16:9 composition, and every visible object from the supplied image.

Both adults remain silent and physically still. Keep camera position, framing, and lens focal length locked throughout. Hold focus on the seated brown-haired man from 0.00 to 0.35 seconds. From 0.35 to 0.80 seconds, perform one smooth rack focus to the light-haired woman's motionless hands on the tablet keyboard, with ease-in and ease-out. Hold focus on the hands from 0.80 to 1.15 seconds. From 1.15 to 1.65 seconds, rack focus smoothly back to the seated man. Hold focus on him from 1.65 through 2.50 seconds. These two connected focus pulls form the only camera behavior; there is no physical camera movement or zoom.

End with focus on the seated man, still silent and unanswered, while the light-haired woman's hands remain motionless on the keyboard and all three water glasses remain unchanged. The final frame must be stable for the choice interface to appear after the video.
```

### Negative prompt

```text
cut, transition, scene change, time jump, second action, answer, nodding, apology, speaking, lip movement, typing, fingers pressing keys, hands lifting, hands dropping onto keyboard, tablet changing owner, water glass disappearing, extra glass, character leaving seat, new person, duplicate person, new object, missing object, identity drift, face drift, hairstyle change, costume change, body proportion change, anatomy error, deformed hands, extra fingers, fused fingers, readable text, subtitles, captions, logo, watermark, HUD, camera shake, handheld motion, auto reframing, pan, tilt, dolly, push-in, pull-back, optical zoom, snap zoom, style change, live action, photorealism, 3D render
```

## 06-B

- 上傳：`public/assets/cutscenes/keyframes/current/06-B.png`
- 片長：3.0 秒

### Main prompt

```text
Use the uploaded image as the exact first frame at time 0 and extend it forward into one single continuous 3.0-second illustrated shot. Do not recreate, reinterpret, restage, or transition into the starting image. Preserve the exact light-haired woman at the meeting-room doorway with her finger already on the light switch, the exact seated brown-haired man, both identities, faces, hairstyles, clothing, body proportions, poses, door, switch, furniture, seating positions, meeting-room geography, current lit state, lighting direction, color palette, line work, painted texture, depth, framing, 16:9 composition, and every visible object from the supplied image.

Use one completely locked wide composition from 0.00 through 3.00 seconds with zero pan, tilt, dolly, optical zoom, focal-length change, focus pull, camera shake, or automatic reframing. The light-haired woman presses the switch, steps out through the existing doorway, and turns off the room light as one continuous exit action. The seated brown-haired man remains in the same seat and does not move toward her. Complete the light change by 2.40 seconds. Hold a clean black frame without camera movement for at least the final 0.60 seconds.

End in stable full darkness. Do not reveal another location inside this shot. The black final frame must be clean and usable as the time-cut transition to the next independently generated shot.
```

### Negative prompt

```text
cut before darkness, transition to home, second location, time jump inside shot, second action, woman returning, man standing, man following, third water glass collection, another person entering, duplicate person, new object, missing object, door moving location, switch moving location, room geography change, light staying on, partial gray frame instead of clean black, identity drift, face drift, hairstyle change, costume change, body proportion change, anatomy error, deformed hands, readable text, subtitles, captions, logo, watermark, HUD, dialogue, speaking, lip movement, camera shake, handheld motion, auto reframing, pan, tilt, dolly, push-in, pull-back, optical zoom, snap zoom, rack focus, style change, live action, photorealism, 3D render
```

## 06-C

- 上傳：`public/assets/cutscenes/keyframes/current/06-C.png`
- 片長：3.0 秒

### Main prompt

```text
Use the uploaded image as the exact first frame at time 0 and extend it forward into one single continuous 3.0-second illustrated shot. Do not recreate, reinterpret, restage, or transition into the starting image. Preserve the exact quiet home interior at night, the dark phone screen, the nearby hand still separated from the phone, the same hand anatomy and pose, furniture, object positions, lighting direction, color palette, line work, painted texture, depth, framing, 16:9 composition, and every visible object from the supplied image. No second person is present.

Hold the camera completely locked from 0.00 to 0.45 seconds. The phone screen then lights with one small notification shape that remains completely unreadable, and the nearby hand begins to approach but stops before touching the phone. From 0.80 to 2.15 seconds, perform exactly one physical dolly-in toward the phone so the phone's width in frame increases by no more than three percent, using a 0.20-second ease-in and a 0.30-second ease-out. This is a physical camera move, not an optical zoom. Stop all camera movement at 2.15 seconds and hold the illuminated phone and suspended hand completely still through 3.00 seconds.

End with the notification still unreadable, the hand visibly not touching or holding the phone, and the same home composition stable for the cut back to runtime text. No reply, message content, or additional event occurs.
```

### Negative prompt

```text
cut, transition, scene change, second location, second action, phone picked up, hand touching phone, hand holding phone, swiping, typing, replying, readable notification, readable message, chat interface, caller name, portrait, second person, duplicate hand, new object, missing object, identity drift, anatomy error, deformed hand, extra fingers, fused fingers, phone morphing, screen changing shape, subtitles, captions, logo, watermark, HUD, dialogue, speaking, lip movement, camera shake, handheld motion, auto reframing, pan, tilt, pull-back, optical zoom, snap zoom, push-in beyond three percent, focus breathing, style change, live action, photorealism, 3D render
```

## 使用規則

- 每個 Main prompt 已包含 first-frame lock、唯一動作、完整 camera timecode、末態與禁止加戲，不需再和其他模板合併。
- 工具沒有 Negative prompt 欄位時，把該鏡 Negative prompt 接在 Main prompt 最後，前面加 `Avoid:`。
- 工具不支援小數片長時，選最接近且不短於規格的長度；只延長最後 hold，不增加動作或 camera move。
- 任何工具輸出仍只是候選。使用者核准前，不得接 runtime、改名為正式 cutscene 或據此自動重跑。
