# property 資料夾

這裡是遊戲內容層。一般劇本修改不需要碰 `src/`。

- `manifest.json`：列出遊戲、角色、UI 與所有場景資料檔。
- `game.json`：遊戲標題、起始場景與初始變數。
- `characters.json`：角色 ID、顯示名稱、職稱等。
- `ui.json`：按鈕與 UI 文案。引擎對每個欄位都有預設值，沒寫的欄位就落在預設值上；通關後的決策點選單另需 `rewindLabel`（開啟按鈕）、`rewindPrompt`（選單標題）、`rewindChoiceLabel`（「你選了：」前綴）、`rewindCloseLabel`（關閉按鈕）。
- `images.json`：立繪、背景、轉場與每個場景的視覺設定。背景可用 `characterFraming` 決定立繪取景：`full`（全身，預設）、`upper-body`（只露頭到腰／大腿，下半身藏在對話框後）、`none`（不疊立繪，給劇情 CG）。取景跟著背景走，不寫死場景；`scenePresentation` 也可以覆寫，但只在確有分鏡例外時才寫。**實際版位依使用者指示一律是半身**：桌機與橫版立繪站在對話框左邊、蓋住對話框，台詞往右讓開，`upper-body` 只是鏡頭再推近一級；手機直版則置中、依角色左右對齊微偏一邊。`none` 在哪種版位都不顯示立繪。角色立繪有兩種寫法，由 `expressions` 的值決定（同一個角色不可混用）：
  - **逐張表情圖**（目前三位角色都用這種）：值是該表情自己的圖片路徑，例如 `"alert": "/assets/characters/full-body/lin-yucheng-alert.png"`。不需要 `src` 與 `columns`。
  - **sprite sheet**：值是畫格索引，另外宣告 `src` 與 `columns`。
  兩種都用 `frameAspectRatio`（單格寬／高）決定立繪框比例；全身圖為 1024×1536，所以是 `0.6667`。
  立繪路徑一律寫原始 PNG 的位置；瀏覽器實際下載的是 `npm run assets:sprites` 產生的同尺寸 WebP
  交付檔（`/assets/characters/web/*.webp`，約為原檔的 6%），換算在程式端處理，資料不必也不該改寫。
  **ChatGPT 換過 `full-body/` 裡任何一張 PNG 後，請執行一次 `npm run assets:sprites` 並一併提交交付檔**；
  忘了做的話 `npm test` 會直接指出哪一張過期。
- `scenes/*.json`：對話、選項、條件、效果與跳轉。
- `romance-microchoices.md`：四組不影響結局的感情線微選擇正式文案；已由 Claude 整合進 `scenes/*.json`（見下方「感情線微選擇」一節的技術寫法）。
- `dialogue-beat-revisions-20260926.md`：六處長段落的正式分拍規格；由 Claude 依原技術欄位拆成連續畫面。
- `narrative-integration-revision-20260926.md`：感情線 setup/payoff 與曾雅琳角色弧的整合修訂；取代孤立的 Scene 5 回憶段落。
- `mba-organizational-debrief.md`：結局後 MBA 案例分析、理論映射、organizational state 與期末報告規劃的正式內容／實作需求。
- `sora-cutscenes.json`：過場的內容提示與連戲規則（由 GPT 維護，已同步官方手繪插畫方向，檔名保留相容）；新版逐鏡起始影格、Runway 動作與交付狀態見 `cutscene-storyboard-v2.md`。原 Sora provider／model／固定時長與 READY 為待 Claude 整理的歷史工具契約，不能代表新版素材已交付。`cutscenes.json` 保存影片格式與缺檔策略；實際接線由 `cutscene-cues.json` 維護。02／04 新版分鏡尚需 Claude 處理播放時序，不能僅靠替換 MP4 上線。

## 目前作品：《最後一次一對一》

- 狀態變數：`trust`（坦誠）、`procedure`（程序）、`boundary`（界線）、`avoidance`（逃避）。四者預設隱藏，不以好感度呈現。
- 每個主要選擇會額外 `set` 一個 `choice1`…`choice5` 字串，供後續場景的條件台詞使用。
- 四組感情線微選擇（`property/romance-microchoices.md`）已接進 s1、s5、s7 與 TRUE END 的對應插入點，只改變當下對話，不改動上述狀態、五個主要選擇或結局分布；技術寫法見下方「感情線微選擇」一節。
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

## 打字與送出（私訊）
`kind: "message"` 的台詞會自動演出「在輸入框裡逐字打、標點後停一下、打完才送出」，不必額外設定。

要演「打了又刪掉」時，在該句加 `drafts`：依序打進輸入框、停一下、再逐字刪掉，最後才是這句的正式內容。

```json
{ "speaker": "zhou-yuan", "kind": "thought", "text": "我寫下「方便聊聊嗎」，刪掉。", "drafts": ["方便聊聊嗎"] }
```

- `drafts` 的字串請沿用該句台詞裡已經寫過的草稿原文；改寫台詞時請一併更新，`npm test` 會檢查兩者是否還對得上並指名是哪一場。
- `message` 以外的台詞（旁白、內心）只演草稿被打了又刪掉，正式內容照原本的方式直接出現——那段文字是在描述剛才那個動作，逐字打出來會變成同一件事講兩次。
- 玩家點畫面、按 Enter 或空白鍵可立刻打完，再點一下才前進；使用者要求減少動態時直接顯示整句。

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

## 感情線微選擇（不影響結局的選項）
選項可以加 `"minor": true`，代表這是不影響結局的短對話分支（例如感情線）：不記入通關後「回到之前的選擇」的決策點選單，也不算進主要決策路徑，因此一律不帶 `effects`。場景也可以加 `"choicePrompt"` 覆寫這一頁選項的提示句（不寫就用 `ui.json` 的 `choicePrompt`）。

實作方式是把插入點拆成「選擇前」「三個分支各一場」「匯流後」四個場景：分支場景各自 `next` 指向同一個匯流場景，匯流場景延續原本被取代的內容。四組感情線微選擇（`s1-look-*`、`s5-memory-*`、`s7-recommend-*`、`ending-true-question-*` 與對應的 `*-converge` / `ending-true-finale`）都照這個結構寫，可以當範本。

```json
{ "id": "recommend-witness", "text": "「妳記得每個測試者說過什麼……」", "next": "s7-recommend-witness", "minor": true }
```
