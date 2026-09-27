# Current cutscene keyframes

這是關鍵影格的**唯一穩定現役路徑**。runtime、optimizer、影片生成與人工審查在完成一次遷移後，只能依鏡號讀取本資料夾，不得綁定 `runway-v2/`、`runway-v3/` 或 `v4-review/`。

## 穩定契約

- 路徑格式：`public/assets/cutscenes/keyframes/current/<shot-id>.png`
- 同一鏡重新生成或修圖：核准後直接替換相同檔名；**不改 cue、shot ID、manifest key 或程式路徑**。
- 只有以下情況需要 Claude 改整合：新增／刪除／改名鏡號、改播放時點、改段落鏡序、改 duration contract、或劇情／角色／場景設計變更。
- 每次替換前，舊圖先保存到一個版本快照；版本資料夾不供 runtime 讀取。
- 本資料夾永遠只放最新現役集合，不混入退役影格。

## 目前完整集合

| 鏡號 | 檔案 | 狀態 |
| --- | --- | --- |
| 00-A | `00-A.png` | REFERENCE ONLY — 正式 00 已採核准成片 |
| 00-B | `00-B.png` | REFERENCE ONLY — 正式 00 已採核准成片 |
| 00-C | `00-C.png` | REFERENCE ONLY — 正式 00 已採核准成片 |
| 04-B | `04-B.png` | CURRENT REVIEW |
| 04-C | `04-C.png` | CURRENT REVIEW |
| 06-B | `06-B.png` | CURRENT REVIEW |
| 06-C | `06-C.png` | CURRENT REVIEW |

機器可讀 hash、來源快照與狀態見 [`manifest.json`](manifest.json)。00-A／B／C 只保留為歷史參考，不得用來重跑已核准的 00；`CURRENT REVIEW` 也不等於使用者已核准。

## 版本與退役

- `../runway-v2/`：v2 歷史來源。
- `../runway-v3/`：v3 歷史來源。
- `../v4-review/`：本次 v4 審查快照；不再是穩定現役路徑。
- `../v4-review/retired/README.md`：目前 18 張退役／被取代影格及原因。
