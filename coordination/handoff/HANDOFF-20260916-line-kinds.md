# HANDOFF-20260916-line-kinds

owner: GPT
requested_by: USER
status: DONE
priority: MEDIUM

## Goal
對話框現在會依台詞類型分四種樣式呈現：對話、內心、旁白、訊息（Teams／私訊）。請確認每句台詞的類型符合敘事意圖。

## Inputs
- 引擎已支援 `lines[].kind`：`dialogue` | `thought` | `narration` | `message`（見 `property/README.md`「台詞類型」）。
- 未寫 `kind` 時自動推斷：`（內心）` 開頭 → thought；`【頻道·發送者】` 開頭 → message；`speaker: null` → narration；其餘 → dialogue。
- 既有劇本**未改動任何文字**，全部靠推斷套上樣式。

## Contract
- Claude 不改台詞內容與分類語意；是否改標由 GPT 決定。

## Deliverables
下列 44 句目前標成 `（內心）`，但內容是第三人稱動作描述（不含「我」），在畫面上會顯示為「周予安 · 內心」。若應是旁白，改成：

```json
{ "speaker": null, "text": "雨澄站起來。" }
```

或保留原文、明確覆寫類型：

```json
{ "speaker": "zhou-yuan", "kind": "narration", "text": "雨澄站起來。" }
```

（明確寫 `kind` 時不會剝掉 `（內心）` 前綴，所以若改成 narration 請一併移除前綴。）

| 檔案 | line index | 內容 |
|---|---|---|
| `ending-decent.json` | 0 | 雨澄收起藍色資料夾。 |
| `ending-decent.json` | 2 | 她站起來。 |
| `ending-decent.json` | 6 | 她走到門口，把識別證翻到背面。 |
| `ending-over-line.json` | 0 | 雨澄站起來，沒有拿桌上的水。 |
| `ending-over-line.json` | 4 | 雨澄拿起手機，走到門口。她停下來，把識別證翻到背面。 |
| `ending-over-line.json` | 6 | 她沒有回頭。 |
| `ending-soft-knife.json` | 0 | 雨澄沒有拿藍色資料夾。 |
| `ending-soft-knife.json` | 6 | 她站起來，把識別證翻到背面。 |
| `ending-soft-knife.json` | 8 | 她看著桌上的資料夾。 |
| `ending-true.json` | 0 | 雨澄把藍色資料夾收進帆布袋。 |
| `ending-true.json` | 5 | 她走到門口，手放在門把上。 |
| `ending-true.json` | 13 | 門關上。冷氣重新啟動。雅琳把第三杯沒人碰過的水收到自己面前。 |
| `ending-true.json` | 20 | 停了很久，三個點才出現。 |
| `ending-true.json` | 22 | 下一則訊息是一張「零號月台咖啡」的地圖。 |
| `s1-final-cut.json` | 2 | 「韌性」通常是叫還沒斷的人再彎一點。 |
| `s1-final-cut.json` | 7 | 她把資料夾放下，封面印著：「離職與權益說明——林雨澄」。「離職」兩字是公司範本，「職位裁撤」是雅琳用黑筆補在旁邊的。 |
| `s1-final-cut.json` | 14 | 遠處，雨澄摘下一邊耳機，轉過來。 |
| `s1-final-cut.json` | 16 | 她把筆夾回識別證掛繩。T 恤胸前的小字寫著 MAKE IT OBVIOUS。 |
| `s3-meeting.json` | 3 | 她沒有問「是好事還是壞事」。這讓答案更清楚。 |
| `s3-meeting.json` | 9 | 她回了一張戴墨鏡的慶祝鸚鵡貼圖。 |
| `s3-meeting.json` | 13 | 十七分鐘後，那隻鸚鵡還停在對話最下方。 |
| `s3-meeting.json` | 18 | 她看見資料夾上的名字，停了一秒才坐下。 |
| `s3-meeting.json` | 20 | 雨澄先看見雅琳，再看見資料夾。 |
| `s3-meeting.json` | 25 | 桌上三杯水，只有雅琳那杯少了一口。 |
| `s4-notice.json` | 2 | 雨澄低頭看了一眼自己的 T 恤。 |
| `s4-notice.json` | 9 | 雨澄終於坐下，把原子筆從掛繩上取下，平放在桌上。 |
| `s4-notice.json` | 15 | 她重複那兩個字，像在檢查按鈕文字。 |
| `s5-when-did-you-know.json` | 3 | 她把兩根手指分開，比出一小段距離。 |
| `s5-when-did-you-know.json` | 13 | 她點亮電子錶。十七點零七分。 |
| `s5-when-did-you-know.json` | 23 | 她重新拿起筆，筆尖卻沒有落下。 |
| `s6-receipt.json` | 0 | 雅琳把藍色資料夾轉向雨澄，沒有推到她手邊，打開第一頁。 |
| `s6-receipt.json` | 7 | 雨澄看著她。 |
| `s6-receipt.json` | 9 | 雨澄的嘴角動了一下，不是笑，比笑更疲倦。 |
| `s6-receipt.json` | 12 | 雨澄把第一頁翻回封面。 |
| `s7-not-in-file.json` | 3 | 她把資料夾往自己方向移近兩公分。那是她第一次主動碰它。 |
| `s7-not-in-file.json` | 5 | 雨澄把筆扣上。 |
| `s7-not-in-file.json` | 9 | 她把資料夾推回桌子中央。 |
| `s7-not-in-file.json` | 11 | 雨澄的手離開資料夾，像桌面忽然變燙。 |
| `s7-not-in-file.json` | 21 | 她低頭，把電子錶按亮，又按暗。 |
| `s7-not-in-file.json` | 23 | 雅琳沒有打字。 |
| `s7-not-in-file.json` | 25 | 冷氣在這時停了。整間會議室忽然安靜得像有人把背景音軌抽走。 |
| `s8-reaction.json` | 0 | 雨澄沒有立刻回答。 |
| `s8-reaction.json` | 6 | 她看向窗外。雨水把對面大樓的招牌切成一格一格。 |
| `s8-reaction.json` | 18 | 雅琳起身，站到桌側，但沒有擋住雨澄。 |

## Validation
`npm test` 會檢查劇本中不殘留未被解析的 `（內心）`／`【…·…】` 前綴。

## Notes
第一人稱但非心聲的敘述（例如「我先進門，把識別證翻到背面」）同樣請判斷是 thought 還是 narration。

已依章節原稿完成分類：原稿明示為內心的內容才使用 `thought`；動作、時間、鏡頭與結局文字皆改為 `narration`；私訊與公司頻道改為結構化 `message`。混合敘事與內心的資料已拆成獨立項目。
