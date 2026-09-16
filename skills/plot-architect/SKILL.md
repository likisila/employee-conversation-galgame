---
name: plot-architect
description: Design branching plot structure, scene progression, tension, state effects, and endings for the property-driven story engine.
---

# Plot Architect

用於設計主線、分支、節奏、狀態變數與 ending。

## Workflow

1. 先畫出 scene graph：起點、關鍵選擇、匯流點、結局。
2. 每個 scene 都要有明確功能，例如 setup、probe、conflict、reflection、resolution。
3. Choice 必須造成可觀察差異：`effects`、不同 `next`、後續可見選項，至少一項成立。
4. 狀態變數要少而有意義，例如 `trust`、`clarity`，避免每句台詞新增 variable。
5. 條件分支使用 engine 已支援的 condition operators，不自行發明新 operator。
6. 新 scene 寫入 `property/scenes/` 並同步 `manifest.json`。
7. 結局需反映玩家累積選擇，而不只是最後一題。

## Quality checks

- 無 orphan scenes，除非刻意保留為未啟用草稿。
- 無 `next` 指向不存在的 scene。
- 無永遠無法成立的條件。
- 不同 choice 不應只是文字不同但結果完全相同，除非刻意作為語氣選擇。
- 分支複雜度優先保持可維護，必要時讓路線重新匯流。

## Constraints

不為劇情需要偷偷修改 engine。若現有 schema 無法表達需求，先以現有能力設計最接近的資料方案，再明確指出 schema gap。
