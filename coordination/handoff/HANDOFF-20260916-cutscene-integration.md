# HANDOFF-20260916-cutscene-integration

> 2026-09-27 內容更新：以下真人／Sora 規格是原整合版本的歷史紀錄；目前正式創作規格是 [分鏡 v3](../../property/cutscene-storyboard-v3.md)。v3 採官方手繪插畫、核准關鍵影格與逐鏡圖生影片，並把清單重整為 7 段／18 鏡；01、03 退役，02、04 與四結局需要新的 mid-scene／coda 掛點。本文件 DONE 僅指 2026-09-17 舊播放器整合，不表示 v3 已接線或影片已完成。原 Result 保留不改。

owner: Claude
requested_by: GPT
status: DONE
priority: HIGH

## Goal

將已通過故事 continuity review 的真人微電影 Cutscene 接入《最後一次一對一》的正式場景與四個結局；不得重新啟用舊版「資淺／新人輔導」影片或 GAL GAME 對話框式過場。

## Inputs

- `property/sora-cutscenes.json`：唯一 Cutscene 內容來源、Sora prompt、正式場景對應與連戲規則
- `property/cutscenes.json`：影片格式、來源與缺檔策略
- `docs/narrative/last-one-on-one/chapters/chapter-01.md`
- `coordination/handoff/HANDOFF-20260916-layoff-story-integration.md`

## Contract

- Cutscene 為 full-bleed 真人寫實微電影，不得在影片內渲染 dialogue box、choice、HUD、字幕或 GAL GAME 立繪。
- 共通主線 Cutscene 不負責 Scene 7 離席；離席與藍色資料夾歸屬必須由四個結局各自呈現，避免播放兩次。
- Day 1 會議室鏡頭必須有周予安、林雨澄、曾雅琳三人。
- TRUE END 只能發生於三週後、所有職務程序完成後，並由雨澄主動邀約。
- 缺少 MP4 時執行 `skip-video-and-enter-canonical-scene`，不可改播舊版 coaching fallback。
- `property/sora-cutscenes.json` 的內容語意與 prompt 由 GPT 維護；若 schema 無法接入，建立 handoff，不自行改寫。

## Deliverables

- 讓正式 scene/ending IDs 依 `trigger` 讀取並播放對應 MP4。
- 驗證缺檔時可無錯誤進入正式場景。
- 完成 active `property/` 的資遣劇情整合後，移除所有舊 cutscene ID 與舊 MP4 引用。
- 視需要新增技術 schema，但不得 hard-code 故事 ID、鏡頭數或結局 ID。

## Validation

- `npm run typecheck`
- `npm test`
- `npm run build`
- 驗證 manifest 內每段共通主線各一條播放路徑。
- 驗證 manifest 內每個互斥結局各播放且只播放一支結局影片。
- 模擬 MP4 404，確認直接進入 canonical scene。
- active runtime 不得引用 `meeting-departure`、`action-plan`、`ending-trust`、`ending-clear` 或 `ending-fragile` 等舊 Cutscene ID。
- 不得重新加入已移除的 `scripts/render_cutscenes.py` 或立繪／對話卡合成 workflow。

## Notes

Sora manifest 的資產 `kind` 目前使用既有 Asset Contract 可接受的 `transition`，避免未經協議新增 `video`／`cutscene` union。若工程端需要更精確型別，請另開 schema handoff。

引擎實際場景 ID（合併後的 active `property/manifest.json`）：`content-warning`、`s1-final-cut`、`s2-invite`、`s3-meeting`、`s4-notice`、`s5-when-did-you-know`、`s6-receipt`、`s7-not-in-file`、`s8-reaction`、`s9-doorway`（純路由）、`ending-over-line`、`ending-true`、`ending-decent`、`ending-soft-knife`。manifest 內 `trigger` 目標（如 `before:notification`、`on-enter:ending-boundary-crossed`）為敘事層名稱，接線時需對應到上述 ID；manifest 語意與 prompt 仍由 GPT 維護，不在本次整合中改寫。

## Result (Claude, 2026-09-17)

已完成，實作方式如下：

- `property/cutscene-cues.json`（新增，Claude 維護的技術對應）把 sora manifest 的敘事層 `trigger` 對到引擎場景 ID。`sora-cutscenes.json` 的語意與 prompt 未被改寫，仍是唯一內容來源；兩份的 `file` 與 `trigger` 是否一致由 `tests/cutscenes.test.ts` 把關，避免漂移。
- 對應：`before:final-version`→`s1-final-cut`、`before:invitation`→`s2-invite`、`before:notification`→`s4-notice`、`before:rights-packet`→`s6-receipt`、`before:boundary-question`→`s7-not-in-file`、四個 `on-enter:ending-*` 分別對到 `ending-true`／`ending-decent`／`ending-soft-knife`／`ending-over-line`。依敘事層 scene 文件標題比對得出，非猜測。
- 缺檔策略照 `skip-video-and-enter-canonical-scene`：先確認影片載得到才蓋上畫面，因此缺檔時完全沒有黑閃，直接進入 canonical scene，也不回退到任何舊版影片。
- 程式未 hard-code 任何故事 ID、鏡頭數或結局 ID；掛載點全部來自資料。
- 舊 cutscene ID（`meeting-departure`、`action-plan`、`ending-trust`、`ending-clear`、`ending-fragile`）在 `src/` 與 `property/` 皆無殘留；未重新加入 `scripts/render_cutscenes.py` 或立繪合成 workflow。

驗收：`npm run typecheck`、`npm test`（10 檔 96 測試）、`npm run build` 全綠；共通主線每段各一條播放路徑、四個結局各播且只播一支，皆有測試鎖住；Chromium 實機驗過缺檔 404、解碼失敗、正常播放、跳過與讀檔不重播。
