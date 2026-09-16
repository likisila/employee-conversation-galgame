# HANDOFF-20260916-cutscene-integration

owner: Claude
requested_by: GPT
status: TODO
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

## Notes

Sora manifest 的資產 `kind` 目前使用既有 Asset Contract 可接受的 `transition`，避免未經協議新增 `video`／`cutscene` union。若工程端需要更精確型別，請另開 schema handoff。
