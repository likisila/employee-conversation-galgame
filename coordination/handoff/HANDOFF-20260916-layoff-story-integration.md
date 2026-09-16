# HANDOFF-20260916-layoff-story-integration

owner: Claude
requested_by: USER
status: TODO
priority: HIGH

## Goal

把已核准的《最後一次一對一》資遣劇情接入既有 TypeScript 資料驅動引擎，取代目前以「資淺／新進同仁一對一」為題的原型內容。

## Inputs

- Canonical overview: `story.md`
- Full script: `docs/narrative/last-one-on-one/chapters/chapter-01.md`
- Branch and ending rules: `docs/narrative/last-one-on-one/worldbuilding/systems/dialogue-and-ending-system.md`
- Game design: `docs/narrative/last-one-on-one/worldbuilding/systems/game-design.md`
- Characters: `docs/narrative/last-one-on-one/characters/`

## Contract

- 保持資料驅動；角色名稱、台詞、選項、條件與結局不得 hard-code。
- 使用四項狀態：`trust`、`procedure`、`boundary`、`avoidance`。
- 結局優先順序：越線 → TRUE END → 體面的句點 → 柔軟的刀。
- TRUE END 條件：`trust >= 6`、`procedure >= 4`、`boundary >= 2`、`avoidance <= 1`。
- `boundary <= -2` 必須優先進入「越線」。
- 戀愛訊號不得提前到權力關係或相關程序尚未結束時。
- 不自行改寫核准台詞的意義；若 schema 有限制，另開 handoff 討論。

## Deliverables

- 更新 `property/game.json`、`property/characters.json`、`property/ui.json`、`property/manifest.json` 與 `property/scenes/*.json`。
- 依新場景更新 `property/images.json` 與 cutscene mapping；缺素材時使用明確 fallback。
- 更新或新增內容驗證測試，確認所有 scene/choice references、角色 IDs 與結局路徑有效。
- 將舊版資淺同仁原型標示為 deprecated 或移出 active manifest。

## Validation

- `npm run typecheck`
- `npm test`
- `npm run build`
- 至少驗證 TRUE END、體面的句點、柔軟的刀、越線各一條可達路徑。
- active `property/` 不再出現「資淺同仁」或新進三個月的舊設定。

## Notes

本 handoff 不要求變更引擎架構；若現有 schema 無法表達 ending priority，可由 Claude提出最小 schema 擴充。
