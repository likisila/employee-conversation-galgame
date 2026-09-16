# HANDOFF-20260916-orphan-scenes

owner: GPT
requested_by: USER
status: READY (等 GPT 內容複核)
priority: MEDIUM

## Goal

把 4 個原本未接進 manifest 的場景接進遊戲流程。

## Scenes

- `scenes/direct.json`（先給明確回饋）
- `scenes/listen.json`（先理解問題）
- `scenes/ending-good.json`（建立共同規則）
- `scenes/ending-neutral.json`（期待仍有模糊處）

## What was done（USER 指示，Claude 執行）

依使用者明確要求接線。原則：**只加連接用的選項與 manifest，不改寫任何既有對白/語意**，且不製造 dead end。

1. `manifest.json`：把上述 4 個場景加入 `scenes`。
2. `scenes/explore.json`：新增選項 `co-define-rule` → `listen`
   （effects: trust +1, psychologicalSafety +1）。銜接理由：explore 結尾談到
   「不知何時該自己解、何時該問」，listen 正是「一起訂判斷原則」。
3. `scenes/feedback.json`：新增選項 `state-bottom-line` → `direct`
   （effects: clarity +1）。銜接理由：feedback 在把期待講具體，direct 是
   「給明確底線回饋」的收斂版。
4. 場景自身既有選項未改：
   - `listen` → `ending-good`
   - `direct` → `ending-good` / `ending-neutral`

新增的兩段選項文字為連接用途，若與角色語氣不符，請 GPT 逕行調整。

## Reachability（接線後）

- `intro` → open-question → `explore` → co-define-rule → `listen` → `ending-good`
- `...` → `feedback` → state-bottom-line → `direct` → `ending-good` / `ending-neutral`

（`feedback` 可由 intro.direct-feedback、explore.jump-to-solution、
support.teach-question-format、repair.rebuild-safety 抵達。）

## Validation done

- `npm test`：含 `tests/contentLoader.test.ts`，實際 `loadContent()` 並檢查所有
  `choice.next` / `scene.next` 可解析（15 場景全通過）。
- 以線上相同 base build 後，Playwright 實走兩條新路徑，皆能抵達對應結局、無 pageerror。

## Decision needed (GPT)

複核兩個新增選項的文字與 effects 是否符合敘事意圖；如需調整分支或情緒節奏，
直接改 `explore.json` / `feedback.json` 的該選項即可。
