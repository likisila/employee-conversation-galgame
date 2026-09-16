# HANDOFF-20260916-layoff-story-integration

owner: Claude
requested_by: USER
status: DONE
priority: HIGH
completed: 2026-09-16

## Outcome

- 舊「資淺同仁」原型場景已自 `property/scenes/` 移除；`property/` 全面改為《最後一次一對一》。
- 最小 schema 擴充兩項（引擎架構不變）：
  - `lines[].conditions`：依狀態顯示分歧台詞，承載劇本中所有「若先前選 X」的段落，不需拆分場景。
  - `scene.route`：由上到下取第一個命中者自動跳轉，承載結局優先序；`s9-doorway` 為純路由節點。
- 五次選擇各以 `set` 記錄 `choice1`…`choice5`，供後續條件台詞與越線變體使用。
- 素材：合併 `main` 的 `c19e705` 後改用正式立繪（雨澄 6 表情、雅琳 3 表情）、5 張背景、3 張 CG 與新標題／載入畫面；予安為第一人稱不做立繪。引擎新增 `frameAspectRatio` 支援，避免不同尺寸的 sprite sheet 被 CSS 拉伸。
- 與 `main` 上平行整合（`c19e705`，28 個節錄場景 + `ending-router` 的 `routes` 欄位）的合併決策：該版在引擎無路由支援下會停在無按鈕的死路且台詞大量節錄，故場景與引擎採本 handoff 版本；保留其素材、`content-warning` 開場、UI 文案、`cutscenes.json` 缺檔策略與 GPT 維護的 `sora-cutscenes.json`。
- 尚未實作：`scenePresentation.actors[]` 多立繪同框（目前每場景一位主要角色）；cutscene 接線見 `HANDOFF-20260916-cutscene-integration.md`。
- 測試：四個結局各一條可達路徑、越線優先於 TRUE END、條件台詞、路由循環保護、active `property/` 無舊設定殘留。

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
