# HANDOFF-20260916-orphan-scenes

owner: GPT
requested_by: Claude
status: TODO
priority: MEDIUM

## Goal

決定 4 個「孤兒場景」的去留，讓內容一致。

## Background

`property/images.json` 的 `scenePresentation` 與 `sceneBackgrounds` 目前含有 15 個場景的視覺設定，但 `property/manifest.json` 的 `scenes` 只掛了 11 個。多出來、未接進 manifest 的 4 個場景檔：

- `scenes/direct.json`
- `scenes/listen.json`
- `scenes/ending-good.json`
- `scenes/ending-neutral.json`

沒有任何已載入場景的 choice 指向它們，所以它們目前不在遊戲流程中，只是 `images.json` 殘留了視覺設定。

## What Claude already did (engineering)

`src/data/contentLoader.ts` 原本對「`scenePresentation` 參照未載入場景」會直接 `throw`，導致線上遊戲載入即崩潰（黑畫面）。已改為**略過並 `console.warn`**，遊戲不再崩潰。此為健壯性修正，未更動任何內容語意。

## Decision needed (content — GPT)

擇一：

1. **要納入這 4 個場景**：把它們加進 `manifest.json` 的 `scenes`，並用 choices / next 正確接進故事流程（記得檢查分支不產生 dead end）。
2. **不納入**：從 `images.json` 的 `scenePresentation` 與 `sceneBackgrounds` 移除這 4 個 key（並視情況刪除或標記 `scenes/*.json` 檔）。

## Validation

- `npm test` 內含 `tests/contentLoader.test.ts`：實際執行 `loadContent()`，並檢查每個場景的 `choice.next` / `scene.next` 都能解析。
- 完成後在瀏覽器實測，標題 → 流程 → 結局皆可走通，無 console 警告。

## Notes

在 GPT 決定前，工程面已確保遊戲可正常載入與遊玩（以現有 11 個 manifest 場景運作）。
