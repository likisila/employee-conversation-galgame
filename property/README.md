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
- `mba-organizational-debrief.md`：結局後 MBA 案例分析、理論映射、organizational state 與期末報告規劃的正式內容／實作需求；已由 Claude 整合為 `mba-debrief.json` ＋ `src/domain/mba.ts`（見下方「MBA Organizational Debrief」一節）。**課程定位是組織行為（Organizational Behavior，OB），不是 HR；往後 Review 與 Playthrough 必須依該文件的「課程定位與 Review 門檻」驗收。理論白話文案、證據方向規則、四方 stakeholder 後果與每結局兩套替代策略亦以此文件為唯一內容定稿。**
- `ob-playthrough-review-20260926.md`：依「組織行為，不是 HR」重新實玩四個結局與最後評估頁的審查紀錄；包含通過項、教學閉環缺口及下一輪驗收標準。
- `mba-debrief-sepia-revision-20260927.md`：`查看案例分析` 的 Sepia 完整文案修訂、語氣原則與 Claude 接線規格；玩家可見文字以 `mba-debrief.json` 為準，程式內硬編碼字串依此文件替換。
- `mba-debrief.json`：上述內容的結構化資料——十五個主要選項對六個維度的加減分與路徑證據、stakeholder matrix、五個決策點的理論映射、四個結局的策略／stakeholder 結果／非預期後果／理論重點／替代方案，以及 Debrief 畫面的文案與區塊標題。`manifest.json` 的 `mba` 欄位指向它。
- `cutscene-storyboard-v4-review.md`：停止生成後的使用者審查稿；從實際 cue 前後文本重新判斷播放段落，暫縮為 00、04、06 共 3 段／7 鏡／約 18 秒。核准前不改 runtime cue。
- `runway-video-spec-v2-review.md`：v4 的 Runway 製作與驗收規格；明確區分播放段落、鏡頭與生成任務，禁止用單鏡代表整段。
- `cutscene-storyboard-v3.md`、`runway-video-shot-pack-v1.md`：已停止使用的歷史版，不得再送生成。`cutscene-storyboard-v2.md` 僅供更早期比對。
- `sora-cutscenes.json`：保留既有影片 ID／檔名／trigger 相容的機器可讀內容清單。所有項目目前為 `TODO`、`BLOCKED` 或 `DEPRECATED`，沒有任何 `READY`／`LOCKED`；舊的一鍵 Sora 腳本不得用來生成 v3。`cutscenes.json` 保存正式手繪視覺小說電影的格式與缺檔策略；實際接線仍由 Claude-owned `cutscene-cues.json` 維護。

## 目前作品：《最後一次一對一》

- 狀態變數：`trust`（坦誠）、`procedure`（程序）、`boundary`（界線）、`avoidance`（逃避）。四者預設隱藏，不以好感度呈現。
- 每個主要選擇會額外 `set` 一個 `choice1`…`choice5` 字串，供後續場景的條件台詞使用。
- 另有 `s1Memory`／`s7Memory` 兩個「敘事記憶」字串：由 s1、s7 的感情線微選擇各自 `set`，只用來讓 Scene 5、TRUE END 自動路由到對應的回聲場景（見下方「感情線微選擇」一節），不參與結局判定、不進「回到之前的選擇」選單。
- 四組感情線微選擇（`property/narrative-integration-revision-20260926.md`）已接進 s1、s5、s7 與 TRUE END 的對應插入點：s1／s7 的選擇會分別在 Scene 5、TRUE END 被回收（setup/payoff），不改動上述核心狀態、五個主要選擇或結局分布；技術寫法見下方「感情線微選擇」一節。
- 曾雅琳的角色弧（Scene 1／3／6，見同一份修訂文件）與六處對話分拍（`property/dialogue-beat-revisions-20260926.md`）已整合進對應場景，純屬敘事節奏與新增對白，不影響任何技術欄位。
- 場景流程：`content-warning → s1-final-cut →（感情線微選擇）→ s2-invite → s3-meeting → s4-notice → s5-when-did-you-know →（依 s1Memory 自動路由的回聲＋新的感情線微選擇）→ s6-receipt → s7-not-in-file →（感情線微選擇）→ s8-reaction → s9-doorway →（四個結局之一，TRUE END 再依 s7Memory 自動路由一段推薦信回聲＋感情線微選擇才到 ending-true-finale）`。
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
選項可以加 `"minor": true`，代表這是不影響結局的短對話分支（例如感情線）：不記入通關後「回到之前的選擇」的決策點選單，也不算進主要決策路徑。大多數不帶 `effects`；s1、s7 的三個選項例外，各自 `set` 一個敘事記憶字串（`s1Memory`／`s7Memory`），供 Scene 5、TRUE END 的 `route` 自動挑對應分支——**這個 `effects` 只能寫敘事記憶變數，不得寫 `trust`／`procedure`／`boundary`／`avoidance` 或 `choice1`…`choice5`**，否則會影響結局判定與 243 條主要路徑分布。場景也可以加 `"choicePrompt"` 覆寫這一頁選項的提示句（不寫就用 `ui.json` 的 `choicePrompt`）。

兩種實作方式，依有沒有下游回聲決定：

1. **單純分支**（沒有下游回聲，例如 TRUE END 最後那組提問）：插入點拆成「選擇前」「三個分支各一場」「匯流後」四個場景，分支場景各自 `next` 指向同一個匯流場景。`ending-true-question-*` 與 `ending-true-finale` 是範本。
2. **setup → 自動路由 → payoff**（s1 的選擇要在 Scene 5 被回收、s7 的選擇要在 TRUE END 被回收）：setup 端的選項 `effects` 寫入敘事記憶；payoff 端前面加一個「路由場景」（`lines: []`、`route` 依敘事記憶挑分支，見「路由場景」一節），玩家不會停在這個場景上。`s5-echo-router → s5-echo-work/detail/pause` 與 `ending-true-recommend-router → ending-true-recommend-precision/witness/honesty` 是範本；兩邊之後才各自接一組不帶敘事記憶的單純分支（`s5-why-not-question` 系列的 `reason-*`）或直接匯流。

```json
{ "id": "look-work", "text": "「看。給我三分鐘。」", "next": "s1-look-work", "minor": true, "effects": [{ "variable": "s1Memory", "operation": "set", "value": "look-work" }] }
```

## MBA Organizational Debrief（結局後可選的案例分析）

> 課程定位：組織行為（Organizational Behavior，OB），不是人力資源管理（HR）。HR、裁撤與文件程序是案例情境；評估核心是權力與依賴、組織公平、心理安全、員工 voice、心理契約、信任、情緒勞動及管理者行為造成的組織後果。完整 Review 門檻見 `mba-organizational-debrief.md` 第零節。

四個結局畫面都有「查看案例分析」按鈕（沒有對應內容時自動不顯示）。內容資料是 `mba-debrief.json`（見上方「property 資料夾」一節），計算在 `src/domain/mba.ts` 的 `computeDebrief()`：

- 只吃五個主要選擇的 ID（`engine.decisionPoints.map(d => d.choiceId)`，本來就已排除感情線微選擇）與結局場景 ID，不讀存檔以外的任何東西，因此同一條路徑每次算出來的內容完全相同。
- 六項 organizational state：五個主要選擇在該維度的加減分加總，門檻 `高 >= 5`、`中 >= 1`、`脆弱 >= -2`、其餘 `低`；證據句取該維度絕對值最大的選項，同分時取較晚的選擇。END 04（越線）的員工主體性／心理安全／程序完整三項會封頂在「脆弱」，不因其他選擇正向而顯得體面。
- 因果鏈與理論鏡頭依「五個選擇裡影響最大的決策點」動態挑選，不是每次都顯示同一批。
- 畫面文案（按鈕、區塊標題、案例限制等）都在 `mba-debrief.json` 的 `copy`，改文案不需要碰 `src/`。
- 要新增／調整結局分析，改 `mba-debrief.json` 的 `endings.<結局場景 id>` 即可；`endings` 缺該結局時，那個結局畫面就不會顯示「查看案例分析」按鈕。
