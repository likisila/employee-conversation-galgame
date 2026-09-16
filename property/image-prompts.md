# Image Generation Prompts

所有正式圖像以內建 ImageGen 生成。重生成時先讀 `characters/` 與 `property/images.json`，保留角色身分、服裝與畫格順序。

## Character: manager

- **Use case:** illustration-story
- **Asset:** 4-column transparent visual-novel sprite sheet
- **Subject:** adult Taiwanese woman manager; shoulder-length straight dark hair tucked behind one ear; muted blue-gray blazer, cream top, charcoal trousers, black low heels, company badge
- **Frames:** neutral, empathetic concern, reflective, calmly resolved
- **Style:** polished contemporary Japanese visual-novel illustration, soft painterly cel shading, realistic adult anatomy
- **Keep:** identical identity, outfit, proportions and lighting across frames; full body and feet visible
- **Avoid:** background, floor, labels, borders, text, watermark, school uniform, chibi proportions

## Character: employee

- **Use case:** illustration-story
- **Asset:** 4-column transparent visual-novel sprite sheet
- **Subject:** young adult Taiwanese woman, junior teammate; chestnut chin-length bob, mustard cardigan, ivory blouse, navy ankle trousers, white sneakers, company badge
- **Frames:** neutral, uneasy, relieved, quietly confident
- **Style:** same style, anatomy and lighting as manager
- **Keep:** identical identity, outfit and proportions across frames; full body and feet visible
- **Avoid:** background, labels, text, watermark, childish treatment

## Backgrounds

All backgrounds: wide 16:9, contemporary Taipei workplace, polished visual-novel painterly realism, no people, no readable text, no logos, quiet lower third for dialogue UI.

- **meeting-room-morning:** glass meeting room, warm oak table, two chairs at a considerate angle, two glasses of water, soft morning skyline.
- **open-office-evening:** mostly empty product office, sleeping monitors, plants, blue-hour city light and a few warm lamps.
- **quiet-room-rain:** private conversation room, three comfortable chairs, water carafe, plant, rain on the window, warm wall light.
- **rooftop-dusk:** rain-wet rooftop garden, bench and planters, Taipei skyline, clouds parting with restrained amber dusk.

## Screens

- **title-key-art:** half-open meeting-room door, two chairs and two untouched glasses of water; early morning; large dark negative space on the left; no text.
- **loading-water:** close-up of two water glasses on an oak table; objects in lower-right; calm empty space for loading copy; no text.

## UI Assets

Dialogue panel, choice frame and scene wipe are deterministic SVGs rather than generated bitmaps. Their colors and spacing follow `design-system/before-we-talk/MASTER.md`.
