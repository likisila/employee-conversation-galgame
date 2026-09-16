# property 資料夾

這裡是遊戲內容層。一般劇本修改不需要碰 `src/`。

- `manifest.json`：列出遊戲、角色、UI 與所有場景資料檔。
- `game.json`：遊戲標題、起始場景與初始變數。
- `characters.json`：角色 ID、顯示名稱、職稱等。
- `ui.json`：按鈕與 UI 文案。
- `images.json`：立繪、背景、轉場與每個場景的視覺設定。sprite sheet 需宣告 `columns` 與 `frameAspectRatio`（單格寬／高），renderer 依此決定立繪框比例。
- `scenes/*.json`：對話、選項、條件、效果與跳轉。
- `sora-cutscenes.json`：真人微電影過場的 Sora 提示、鏡頭與連戲規則（由 GPT 維護）；`cutscenes.json` 只保存影片格式與缺檔策略。兩者目前皆不由 runtime 載入，接線見 `coordination/handoff/HANDOFF-20260916-cutscene-integration.md`。

## 目前作品：《最後一次一對一》

- 狀態變數：`trust`（坦誠）、`procedure`（程序）、`boundary`（界線）、`avoidance`（逃避）。四者預設隱藏，不以好感度呈現。
- 每個主要選擇會額外 `set` 一個 `choice1`…`choice5` 字串，供後續場景的條件台詞使用。
- 場景流程：`content-warning → s1-final-cut → s2-invite → s3-meeting → s4-notice → s5-when-did-you-know → s6-receipt → s7-not-in-file → s8-reaction → s9-doorway →（四個結局之一）`。
- `s9-doorway` 是純路由節點，依序判定：**越線**（`boundary <= -2`）→ **TRUE END**（`trust >= 6`、`procedure >= 4`、`boundary >= 2`、`avoidance <= 1`）→ **體面的句點**（`procedure >= 4`、`trust >= 2`、`boundary >= 0`）→ **柔軟的刀**（其餘）。

## 修改角色名字
只改 `characters.json` 的 `displayName`。場景只使用穩定 `id`，不用逐場景搜尋替換。

## 修改對話
直接改 `scenes/*.json` 裡的 `lines[].text`。

## 台詞類型（對話框樣式）
每句台詞可寫 `kind`，決定畫面呈現：

| kind | 呈現 | 寫法 |
|---|---|---|
| `dialogue` | 名牌（對話框上緣）＋台詞 | `{ "speaker": "lin-yucheng", "text": "我把檔案存好了。" }` |
| `thought` | 名牌同對話；本體是來源端泡泡（頭像在左）、虛線框、淡色字 | `{ "speaker": "zhou-yuan", "text": "（內心）……" }` |
| `narration` | 無名字、置中 | `{ "speaker": null, "text": "雨澄準時進來。" }` |
| `message` | Teams 風格訊息卡（頻道標籤、頭像、泡泡） | `{ "speaker": null, "text": "【私訊·林雨澄】……" }` |

沒寫 `kind` 時依上表「寫法」自動判斷，並把 `（內心）`、`【頻道·發送者】` 前綴從顯示文字中移除。也可以明確寫出欄位，不必用前綴：

```json
{ "speaker": null, "kind": "message", "channel": "Teams", "from": "林雨澄", "text": "收到。" }
```

正式劇本請優先明確填寫 `kind`。動作、時間、鏡頭與場景描述使用 `speaker: null` 搭配 `kind: "narration"`；內心話才使用角色 `speaker` 搭配 `kind: "thought"`。同一筆不可混合兩種類型，避免遊戲把敘事誤顯示成角色台詞。

`game.json` 的 `player` 指定玩家角色。玩家自己的對話與內心：名牌改青色並加「你」標記，對話框頂線同色；其他角色的名牌是琥珀色。訊息卡的發送者對得到該角色時（「予安」會對到「周予安」），訊息靠右顯示。`ui.json` 可用 `playerLabel` 改「你」的文字。

## 條件台詞（依先前選擇分歧）
`lines[]` 的每一句都可以帶 `conditions`；全部成立才顯示，沒有 `conditions` 則永遠顯示。

```json
{ "speaker": "lin-yucheng", "text": "我把檔案存好了。", "conditions": [{ "variable": "choice1", "operator": "eq", "value": "clear" }] }
```

支援的 operator：`eq`、`neq`、`gt`、`gte`、`lt`、`lte`。

## 場景中途換景（時間與地點跳躍）
同一個場景裡若有時間或地點跳躍（例如結局的「三週後」），在跳躍的那一句寫 `background`／`character`，效力延續到同場景下一句指定為止：

```json
{ "speaker": null, "kind": "narration", "text": "黑畫面。三週後。夜晚，予安住處，手機亮起。", "background": "apartment-phone-night", "character": null }
```

- `background`：`images.json` 的 `backgrounds` ID。換景時會自動補一次該場景的轉場，不會硬切。
- `character`：角色 ID 代表固定顯示那個人；`null` 代表已離場，之後誰說話都不顯示立繪。沒有寫過任何 `character` 的場景才適用「立繪跟著說話者走」。
- 兩者都會在載入時檢查；指向不存在的背景或沒有立繪的角色會直接報錯，不會變成黑畫面。

## 路由場景（有優先序的自動跳轉）
場景可以帶 `route`，引擎會**由上到下**取第一個條件全部成立的項目自動前往，玩家不會停在路由場景上。最後一項不寫 `conditions` 即為預設路徑。

同一項裡的多個 `conditions` 是「而且」；要表達「或」就寫成多項指向同一個場景（例如「私下補錢」**或**「權力關係仍在時告白」都直接鎖 END 04，不受後續界線加分抵銷）。

```json
{
  "id": "s9-doorway",
  "lines": [],
  "choices": [],
  "route": [
    { "conditions": [{ "variable": "choice4", "operator": "eq", "value": "private" }], "next": "ending-over-line" },
    { "conditions": [{ "variable": "boundary", "operator": "lte", "value": -2 }], "next": "ending-over-line" },
    { "next": "ending-soft-knife" }
  ]
}
```

## 新增場景
1. 新增 `scenes/your-scene.json`。
2. 把檔名加入 `manifest.json` 的 `scenes`。
3. 讓某個選項的 `next`、場景的 `next` 或 `route` 指向新場景的 `id`。
4. 如需視覺設定，在 `images.json` 的 `sceneBackgrounds` / `scenePresentation` 加上同名項目。立繪跟著說話者走：顯示目前這句（含）之前最後一位有立繪的說話者（對話與內心都算）；場景開頭還沒有人說話時（旁白、訊息）才用 `scenePresentation.character`。`expression` 只套在 `character` 指定的那位身上，換成別人時用該角色的 `defaultExpression`。若整場背景都是描繪角色的 CG、不希望再疊立繪，在 `scenePresentation` 寫 `"character": null`；只有中途某一段要換景或送角色離場，改用台詞層級的 `background`／`character`（見上節）。

## 分支變數
`game.json` 的 `initialState` 可新增任意字串、數值或布林值。選項透過 `effects` 修改狀態（`add` 僅限數值、`set` 可為任何型別），透過 `conditions` 決定是否顯示。
