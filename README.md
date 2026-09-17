# Employee Conversation Gal Game

一個以 **TypeScript + Vite** 實作的資料驅動視覺小說引擎。目前載入的作品是《最後一次一對一》：部門主管周予安必須在下班前通知設計師林雨澄，她的職位已被裁撤。玩家的選擇不決定她是否「原諒」你，而是決定她能否帶著尊嚴離開。劇本與設定見 `story.md` 與 `docs/narrative/last-one-on-one/`。

核心原則：**內容放 `property/`，引擎放 `src/`。角色名稱、對話、選項、分支與結局判定都不 hard-code。**

## 快速開始

```bash
npm install
npm run dev
```

## 專案結構

```text
.
├── property/                 # 可直接編輯的遊戲資料
│   ├── manifest.json
│   ├── game.json
│   ├── characters.json
│   ├── ui.json
│   └── scenes/
├── src/
│   ├── data/                 # 載入與驗證 property
│   ├── domain/               # TypeScript schema + runtime validation
│   ├── engine/               # 對話、條件、效果與跳轉
│   └── ui/                   # 畫面 rendering
├── tests/
└── .github/
```

## 不 hard-code 的設計

角色顯示名稱放在 `property/characters.json`。場景只保存角色 ID，因此改名字只改一個地方。

所有對話、選項與跳轉位於 `property/scenes/*.json`。分支條件與狀態效果也是資料，而不是寫死在 TypeScript。

```json
{
  "conditions": [{ "variable": "trust", "operator": "gte", "value": 2 }],
  "effects": [{ "variable": "procedure", "operation": "add", "value": 1 }]
}
```

除了選項，`lines[]` 也可以帶 `conditions`，用來呈現「依先前選擇」才出現的台詞；場景可以帶 `route`（依序判定、取第一個命中者自動跳轉），用來實作有優先序的結局判定。細節見 `property/README.md`。

## 驗證

```bash
npm run typecheck
npm test
npm run build
```

## 部署（GitHub Pages）

`.github/workflows/deploy.yml` 會在 push 到 `main` 時自動 build 並部署到 GitHub Pages。

啟用方式：**Settings → Pages → Build and deployment → Source** 選 **GitHub Actions**。之後每次 push 到 `main` 就會自動更新，網址為 `https://<owner>.github.io/<repo>/`。

因為專案站服務在 `/<repo>/` 子路徑，workflow 以 `--base=/<repo>/` build；`property/images.json` 內的 `/assets/...` 邏輯路徑會在載入時透過 `import.meta.env.BASE_URL` 解析成正確 URL（見 `src/data/assetPath.ts`），資料本身不需修改。

## 過場影片

`property/sora-cutscenes.json`（ChatGPT 維護）是影片內容的唯一來源；`property/cutscene-cues.json`（Claude 維護）把它的敘事層 `trigger` 對到引擎場景 ID，決定哪一段影片掛在哪個場景之前。兩份的檔名與 trigger 是否一致由 `tests/cutscenes.test.ts` 把關。

進入掛有影片的場景時，先確認影片載得到才蓋上畫面，接著全螢幕播放，播完自動進入該場景。影片缺檔、解碼失敗或載入逾時都直接進入場景（`property/cutscenes.json` 的 `skip-video-and-enter-canonical-scene`），不會有黑畫面，也不回退到任何替代影片。

播放中可用畫面點擊、Enter／空白鍵、Esc 或右下角的「跳過」按鈕跳過；旁邊的按鈕可切換靜音，偏好記在瀏覽器。已播完或跳過的影片不會重播，這個狀態跟著存檔走，重新載入不會再看一次；「重新開始」則清空，重玩時影片會再播。

實作：`src/ui/cutscene.ts`（播放器）、`src/data/contentLoader.ts`（載入與驗證）、`StoryEngine` 的 `hasWatchedCutscene`／`markCutsceneWatched`。

## 存檔 / 讀檔

對話採視覺小說節奏：一次只顯示一句，點畫面（或按 Enter／空白鍵）才到下一句；該場台詞讀完後才出現選項或結局按鈕。

私訊會演出來：`kind: "message"` 的台詞逐字打進輸入框、標點後停一下、打完停一下才送出（送出時泡泡從半透明變成正常並輕輕彈一下）。宣告了 `drafts` 的台詞會先演一次「打了又刪掉」——草稿逐字打出來、停一下、再逐字刪掉，最後才是那句的正式內容。打字期間不顯示前進的 `▼`；點畫面、按 Enter 或空白鍵是「立刻打完」而不是前進，再點一下才到下一句。同一句只演一次（回上一句再前進不會重打），`prefers-reduced-motion` 直接顯示整句，螢幕閱讀器也一開始就拿到完整台詞。實作：`src/ui/typing.ts`（節奏計算與播放）、`src/ui/render.ts`（接到台詞上）；資料寫法見 `property/README.md`。

往回看：點對話框左側 1/3 的區塊、按鍵盤左方向鍵，或點對話框左緣的三個小箭頭，都會回到上一句（跨場景時回到上一場的最後一句）。做過選擇的那一頁不能回去——一旦選了，回溯紀錄就清空，因此無法回頭改選；載入存檔與重新開始同樣從沒有回溯紀錄的狀態開始。有上一句可回時才會出現左側箭頭。

## 通關後回到決策點

走到任一結局後，結局畫面除了「重新開始」還有「回到決策點」。它會列出這一輪做過的每一個選擇（場景標題 ＋ 當時選了哪一項），點任一項就跳回按下那個選項之前：場景、停在哪一句與所有狀態數值都還原成選擇前，可以直接改選另一項往下走，不必從頭重玩。

- 回到某個決策點時，該決策點與其後的決策紀錄一併作廢；重新選過之後，清單會依新走的路線重建。
- 跳回去之後不能再用「回到上一句」退進已作廢的那條路（回溯紀錄清空）。
- 已看過的過場影片不會因此重播——回到決策點是續玩同一輪，只有「重新開始」才會讓影片再播一次。
- 決策紀錄跟著存檔走，所以通關後關掉瀏覽器再回來，「繼續上次」仍然回得到任一決策點。
- 這個功能上線前存的舊檔沒有決策紀錄，但仍記著完整狀態，因此讀檔時會從起始場景窮舉所有選擇組合，反推出「停在同一場景、狀態完全相同」的那條路徑（正式內容 243 條，實測約 1 ms）。只有恰好一條對得上才採用：兩條以上代表推不出唯一的歷史，寧可不顯示也不會列出玩家沒做過的選擇。因此舊存檔不必重玩也能用這個選單。
- 選單以浮層蓋在結局畫面上：可用 Esc、「關閉」按鈕或點浮層外圍關閉，焦點限制在選單內，關閉後回到原本的結局畫面。

實作：`StoryEngine` 的 `decisionPoints` / `rewindTo()` 與 `src/ui/render.ts` 的決策點選單。

## 存檔內容

進度會自動存進瀏覽器 `localStorage`：玩家每前進一句或做一次選擇，就寫入一份快照（目前場景 + 讀到第幾句 + 狀態數值 + 已看過的過場影片 + 決策點紀錄）。

- 標題畫面偵測到存檔時，會多出「繼續上次」按鈕；沒有存檔時只顯示「開始對話」。
- 存檔採版本化封裝（`ecg:save:<gameId>`）。版本不符、資料損壞或屬於其他遊戲的存檔會被安全丟棄並清除。
- 若存檔指向的場景在內容改版後已不存在，讀取時會丟棄存檔並改開新局，而不是崩潰。
- 在隱私模式或配額用盡等無法存取 `localStorage` 的情況下，遊戲照常進行，只是不做持久化。

實作：`src/data/saveStore.ts`（持久化層，storage 可注入以便測試）與 `StoryEngine.snapshot` / `restore()`（引擎快照）。詳見 `docs/technical/save-load.md`。

## 後續可擴充

- 角色立繪 / 表情 / 背景圖外部化到 `property/`。
- 多語系 `property/locales/zh-TW.json`、`en.json`。
- JSON Editor / 劇本編輯器，讓非工程師直接改內容。
- 多存檔槽 / 手動存讀檔 UI。
- AI 產生 scene draft，但仍存回同一套 schema。
## Sora 劇情過場

`property/sora-cutscenes.json` 定義 8 秒、720p 的真人寫實微電影過場，涵蓋共通主線與互斥結局。所有鏡頭以正式資遣劇本為準；鏡頭數、單價與完整生成上限以 manifest 及 dry-run 輸出為準。

`property/cutscenes.json` 只保存影片格式、來源與缺檔策略；實際 Sora 提示、觸發點、正式場景對應、角色連戲、道具狀態與生成後檢查表位於 `property/sora-cutscenes.json`。影片尚未生成或缺檔時，遊戲應略過影片並直接進入對應的正式場景，不使用舊版替代影片。

先驗證 manifest 並檢查最終提示，不產生費用：

```bash
npm run videos:sora -- --dry-run
```

本機生成：

```bash
OPENAI_API_KEY="..." npm run videos:sora
```

也可只生成指定鏡頭：

```bash
OPENAI_API_KEY="..." npm run videos:sora -- --ids=layoff-notification,ending-true
```

請勿把 API key 寫入檔案或提交版本控制。若要由 GitHub 生成，將 key 存為 repository secret `OPENAI_API_KEY`，再手動執行 **Generate Sora cutscenes** workflow；成功後 workflow 會提交 MP4 與生成報告。

每次生成後必須依 manifest 的 `postGenerationReview` 驗證：不得出現 GAL GAME 對話框或 HUD、三位演員與服裝必須連戲、Day 1 的會議室鏡頭必須有 HR 曾雅琳，且僅 TRUE END 可在三週後由林雨澄主動開啟私人會面。

舊版 `render_cutscenes.py`、自動合成立繪／對話卡的 workflow 與其輸出影片已移除，避免後續素材更新重新產生錯誤的 GAL GAME 式 Cutscene。
