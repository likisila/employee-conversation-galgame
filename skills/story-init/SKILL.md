---
name: story-init
description: Initialize or reshape a data-driven Gal Game story using property JSON without hard-coding narrative content in TypeScript.
---

# Story Init

用於建立新故事、訓練情境或重新整理現有故事骨架。

## Read first

- `property/manifest.json`
- `property/game.json`
- `property/characters.json`
- `property/ui.json`
- `property/scenes/*.json`

## Workflow

1. 明確定義玩家身份、對話對象、訓練目標與希望觀察的行為。
2. 建立或調整 `characters.json`，角色使用穩定 `id`，顯示名稱放 `displayName`。
3. 在 `game.json` 設定 `startScene` 與必要的 initial state variables。
4. 建立 opening scene，讓玩家快速理解情境與衝突。
5. 至少規劃一個有意義的 choice，且 choice 的差異必須反映在 effects、後續 scene 或兩者。
6. 新 scene 要加入 `manifest.json`。
7. 檢查所有 `speaker`、`next` 與 variable references。

## Constraints

- 不把角色名稱、台詞、scene id 寫進 `src/`。
- 不為單一故事特例修改 StoryEngine。
- 不使用顯示文字當作永久 ID。
- 除非使用者要求，保留現有角色與 scene，不做破壞性重寫。

## Done when

故事能從 `startScene` 開始，所有分支都可到達有效 scene，且內容修改只需編輯 `property/`。
