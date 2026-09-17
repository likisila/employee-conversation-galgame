# Claude 交接紀錄

本檔由 Claude 專用，採最新紀錄在最下方。ChatGPT（包含 Codex）必須讀取，但不得修改。

## Claude-20260916-1512

- 時間：2026-09-16T15:12:00Z
- 分支或 PR：`claude/zen-hopper-fnj8g4`
- 已讀對方紀錄：`ChatGPT-20260916-1445`（已讀，接受：雙向交接機制照辦，本筆為 Claude 第一筆紀錄）
- 本次範圍：文案更新（`e69eb1b` 修正劇本文字類型分類）後的全遊戲審查，並修正審查中找到的程式／整合缺陷。
- 實際變更檔案：`src/ui/presentation.ts`（新增）、`src/ui/render.ts`、`src/domain/schema.ts`、`src/data/contentLoader.ts`、`src/main.ts`、`src/style.css`、`index.html`、`property/images.json`、`property/scenes/ending-{true,decent,soft-knife,over-line}.json`、`property/README.md`、`tests/presentation.test.ts`（新增）、`tests/contentLoader.test.ts`
- 已定案事項：
  1. 台詞可帶 `background` 與 `character`（分鏡指示，效力延續到同場景下一個指定為止），修正四個結局「人還在會議室、畫面已經跳到後段 CG」的連戲錯誤；`apartment-phone-night`、`platform-zero-cafe` 兩張原本沒被任何場景使用的背景已接上 TRUE END。
  2. 同場景中途換景會自動補該場景的轉場，不做硬切。
  3. `index.html` 的跳過連結原本指向不存在的 `#game`，改為 `#app`；另外加上常駐的 `role="status"` 播報區，讓每句台詞都能被螢幕閱讀器讀到。
  4. 全劇 243 條路徑已用程式走過一次：四個結局都到得了、沒有斷頭場景、沒有永遠不會顯示的台詞或選項、條件變數全部有被設定。
- 交給 ChatGPT（依角色邊界，以下都不是 Claude 能自行處理的）：
  1. **立繪尺寸不一致**：`lin-yucheng` 每格 296×227（寬高比 1.30），`zeng-yalin` 512×214、`zhou-yuan` 1012×423（皆 2.39）。三張的人物都佔滿格高，但格子左右留白差很多（人物佔格寬 75% / 46% / 39%），renderer 依格寬換算高度後，雨澄在畫面上比另外兩人大約 1.8 倍（1280×800 實測 433px vs 235px）。請重新輸出三張 sprite sheet：**同一個單格寬高比、人物佔格高一致、水平置中，且同一角色的不同表情不要左右位移**（雅琳 `neutral` 在 x 217–454、`alert` 在 x 132–363，切表情時人物會橫移）。
  2. **`property/ui.json` 缺 `playerLabel` 與 `tapToContinueLabel`**，目前落在程式預設值「你」「點擊畫面繼續」。請補上正式文案。
  3. **`s8-reaction` 的 `title` 與 `s7-not-in-file` 都是「沒有寫在文件裡」**，轉場卡會連續出現兩張同名標題，請給 s8 一個自己的場景標題。
  4. **結局結尾那一句**（例：`END 04：越線　　喜歡不會自動取消權力。……`）用全形空白把標題和收束句擠在同一句旁白裡，手機上會斷在奇怪的位置。請決定要拆成兩句，還是由 Claude 做一張獨立的結局卡（需要標題／收束句兩個欄位）。
  5. **favicon 未提供**（瀏覽器對 `/favicon.ico` 取得 404）。需要一張圖示。
- 未決問題或阻塞：
  1. 結局分布偏斜：243 條路徑中 TRUE END 3 條（1.2%）、END02 體面的句點 10 條（4%）、END04 越線 108 條（44%）、END03 柔軟的刀 122 條（50%）。目前門檻與 `docs/narrative/.../game-design.md` 完全一致，所以不算實作錯誤，但要不要調整是企劃決定。
  2. 同一份文件寫「越線」是 `boundary ≤ -2`，而 `doc-private`（私下補錢，-2）可以被後面的 `keep-advocate`（+2）抵銷；27 條走過私下補錢的路徑最後不是 END04。若希望「越線一次就算越線」，Claude 可改成由選項直接 `set` 一個旗標再路由——需要企劃確認後再動。
- 驗證結果：`npm run typecheck`、`npm test`（8 檔 67 測試）、`npm run build` 全綠；另以 Chromium 實機從標題走到四個結局各一次，確認換景時機、立繪切換、存讀檔（重新載入後「繼續上次」回到同一句）、桌機 1280×800 與手機 390×844 版面皆無溢出或主控台錯誤。

## Claude-20260916-2155

- 時間：2026-09-16T21:55:00Z
- 分支或 PR：`claude/zen-hopper-fnj8g4`
- 已讀對方紀錄：`ChatGPT-20260916-2139`（逐項回覆如下）、`ChatGPT-20260916-2050`（明亮美術，一併合併驗證）
- 本次範圍：把 `origin/main` 的素材與文案合併進本分支，實作 ChatGPT 的結局企劃定案，並重新驗證實機呈現。
- 實際變更檔案：`property/scenes/s9-doorway.json`、`property/scenes/ending-soft-knife.json`（合併衝突解為「分鏡欄位 ＋ 拆成兩句的結局收束」並存）、`property/README.md`、`index.html`、`tests/endingRoutes.test.ts`（新增）
- 逐項回覆 `ChatGPT-20260916-2139`：
  1. 人物圖格 — **完成**。三張 sheet 已是 512×512 單格（3072／1536／512 寬），`frameAspectRatio: 1`。實機量到三位角色的立繪框都是同尺寸（1280×800 下 527–559 px，差異只來自對話框高度變化），先前雨澄比其他兩人大 1.8 倍的問題消失；表情切換不再橫移。不需要再改 CSS／renderer。
  2. 正式 UI 文案 — **完成**，`playerLabel`／`tapToContinueLabel` 已由 `ui.json` 提供，程式預設值不再生效。
  3. `s8-reaction` 標題「答案的重量」— **完成**，轉場卡不再連兩張同名。
  4. 結局收束拆成兩句 — **完成**，桌機與手機都在一行內讀完，不再有全形空白造成的斷行。已不需要新的結局卡 schema。
  5. favicon — **完成，但需補一步**：`public/favicon.ico` 本身正確，然而瀏覽器預設是向網域根目錄要 `/favicon.ico`，部署在 `/<repo>/` 子路徑時仍會 404。已在 `index.html` 明寫 `<link rel="icon">`，build 會依 base 改寫成 `/employee-conversation-galgame/favicon.ico`；實測 preview 回 200。
  6. 結局企劃定案 — **已實作**。在 `s9-doorway` 的 `route` 最前面加兩項：`choice4=private`、`choice5=confess` 各自無條件指向 `ending-over-line`（同一項的多個 conditions 是 AND，所以「或」寫成兩項）。`boundary ≤ -2` 的累計制判定保留在其後，一般界線分數行為不變。新增 `tests/endingRoutes.test.ts` 枚舉 243 條路徑鎖住這條規則。
- 243 條路徑重新枚舉結果：`ending-over-line` 135（55.6%）、`ending-soft-knife` 95（39.1%）、`ending-decent` 10（4.1%）、`ending-true` 3（1.2%）。四個結局都到得了，沒有斷頭路徑。
- 交給 ChatGPT：`docs/narrative/last-one-on-one/worldbuilding/systems/game-design.md` 第 54 行的結局判定表仍寫「END 04 越線 ｜ boundary ≤ -2」，與本次定案（私下補錢／告白無條件鎖 END 04）不一致。該文件屬企劃文案，請由 ChatGPT 更新，程式與資料以本次定案為準。
- 未決問題或阻塞：無。
- 驗證結果：`npm run typecheck`、`npm test`（8 檔 71 測試）、`npm run build`、`vite build --base=/employee-conversation-galgame/` 全數成功；Chromium 實機重跑：TRUE END（0,0,0,0,0）、私下補錢＋其餘皆佳（0,0,0,2,0，正確鎖 END 04）、告白（0,0,0,0,2）各一次，桌機 1280×800 與手機 390×844 皆無對話框溢出、無主控台錯誤、`/favicon.ico` 回 200。

## Claude-20260917-0045

- 時間：2026-09-17T00:45:00Z
- 分支或 PR：`claude/elegant-wozniak-evo2rc`
- 已讀對方紀錄：`ChatGPT-20260916-2159`（接受：END 04 正典已與實作一致，無待辦；本次未觸及企劃文件與素材）
- 本次範圍：新增「回到上一句」導覽（對話框左側 1/3 點擊區、鍵盤左方向鍵、左緣三個小箭頭），並確保不能退回已做過選擇的那一頁。
- 實際變更檔案：`src/engine/StoryEngine.ts`、`src/ui/render.ts`、`src/style.css`、`src/domain/schema.ts`、`tests/history.test.ts`（新增）、`tests/engine.test.ts`、`README.md`、`docs/ai-handoff/CLAUDE.md`
- 已定案事項：
  1. `StoryEngine` 內部維護回溯快照堆疊（上限 200 步）：`advance()`／`continue()` 前進前記錄目前這一句，`back()` 退回上一筆，並公開 `canGoBack`。因此跨場景（沒有選項、靠 `next` 銜接，例如內容提醒→最終版、s5→s6、s8→結局）也能退回上一場最後一句。
  2. 「不能回去已選擇的對話頁面」的實作方式：`choose()` 成功套用效果後把整串回溯紀錄清空，所以選擇後無法退回選項頁，也不可能改選；`restart()` 與 `restore()`（讀檔）同樣從空紀錄開始。
  3. 觸發方式三種：點對話框左側 1/3 的非按鈕區域、鍵盤 `ArrowLeft`、點左緣箭頭按鈕（真按鈕，可 Tab 聚焦，帶 `aria-label`）。對話框其餘 2/3 與畫面其他地方維持原本的「下一句」。沒有上一句可回時左側區塊回到原本的前進行為，箭頭也不顯示。
  4. 回溯不重播轉場卡、轉場動畫與立繪淡入（renderer 以 `steppingBack` 對齊上一次 render 的場景／立繪／背景紀錄），直接停在那一句。回溯後會重新存檔，重新載入不會又跳回較後面的位置。
  5. 對話框左側留白固定保留（與右側 `▼` 前進提示對稱），箭頭出現或消失時台詞不會左右跳動。
- 交給 ChatGPT（依角色邊界，Claude 不自行定案正式文案與視覺規格）：
  1. **`property/ui.json` 缺 `backLabel`**：這是左側箭頭按鈕的螢幕閱讀器標籤，目前落在程式預設值「回到上一句」。請補上正式文案（`parseUi` 已支援此欄位，補進 JSON 即生效）。
  2. **箭頭視覺為暫定實作**：目前用三個 `◀` 文字字元，青色、字級 0.58rem、由右至左的波浪淡入淡出，對齊對話框左緣並垂直置中（與既有 `▼` 前進提示同一套做法，未新增任何圖片素材）。若要改成正式的 UI 視覺（自訂字形、圖示或動態規格），請提供設計規格或素材，Claude 再實作。
  3. **是否要在遊戲內說明這個操作**：README 已寫，但畫面上沒有任何提示文案。若需要（例如第一次出現箭頭時的一行提示），請提供文案，Claude 再接。
- 未決問題或阻塞：無（上述三項皆為可選的後續優化，不阻擋本次變更）。
- 驗證結果：`npm run typecheck`、`npm test`（9 檔 78 測試，新增 `tests/history.test.ts` 7 個案例涵蓋「同場景回退」「跨場景回退」「選擇後不可回頭」「讀檔／重新開始清空紀錄」）、`npm run build` 全數成功。Chromium 實機（桌機 1280×800 與手機 390×844）逐項確認：第一句不顯示箭頭；前進後箭頭出現且為水平三個小箭頭；點左 1/3、按 ArrowLeft、點箭頭三種方式都回到上一句；跨場景回退回到上一場最後一句且不重播轉場卡；在選項頁仍可回上一句，選擇之後箭頭消失、ArrowLeft 無作用、且新場景第一句退不回選項頁；重新載入讀檔後不可回溯；對話框右側 2/3 仍是前進。主控台僅有沙箱代理阻擋 Google Fonts 的 `ERR_CERT_AUTHORITY_INVALID`（與本次變更無關）。

## Claude-20260917-0150

- 時間：2026-09-17T01:50:00Z
- 分支或 PR：`claude/elegant-wozniak-evo2rc`
- 已讀對方紀錄：`ChatGPT-20260916-2159`（無更新的新紀錄）
- 本次範圍：依使用者指示「箭頭不用圖片，你直接產生就好」，把回上一句的三個箭頭改為程式直接產生的 inline SVG，並撤回上一筆交給 ChatGPT 的箭頭視覺需求。
- 實際變更檔案：`src/ui/render.ts`、`src/style.css`、`docs/ai-handoff/CLAUDE.md`
- 已定案事項：
  1. 箭頭由 renderer 產生三個 inline SVG 實心三角形（`viewBox="0 0 8 10"` 的 `polygon`），不再使用字型字元 `◀`，也不需要任何圖片素材。改用 SVG 的理由是字型字元在不同平台的字形與大小會漂移，SVG 形狀固定、可任意縮放、且不吃字型載入。
  2. 顏色走 `currentColor`（平常青色、hover／focus 轉琥珀色），尺寸與動畫都在 CSS：每個箭頭 0.38×0.48rem、間距 0.1rem，由右至左依序亮起並微微左移的波浪，讀起來就是「往回一句」的方向。`prefers-reduced-motion` 由既有的全域規則收掉動畫，箭頭仍以固定不透明度顯示。
  3. 對話框左側留白配合調整為 2rem，確保台詞不會壓到箭頭。
- 撤回上一筆（`Claude-20260917-0045`）交給 ChatGPT 的第 2 項：箭頭視覺已由使用者指示改為 Claude 直接產生，**不需要 ChatGPT 提供設計規格或素材**，此項結案。第 3 項（是否要在畫面上加操作提示文案）同樣不追，除非日後另有需求。
- 交給 ChatGPT：僅剩 `Claude-20260917-0045` 的第 1 項仍開著——`property/ui.json` 缺 `backLabel`（左側箭頭按鈕的螢幕閱讀器標籤），目前落在程式預設值「回到上一句」。補進 JSON 即生效，不阻擋任何功能。
- 未決問題或阻塞：無。
- 驗證結果：`npm run typecheck`、`npm test`（9 檔 78 測試）、`npm run build` 全數成功。Chromium 實機重跑同一份逐項檢查（桌機 1280×800 與手機 390×844）：三種觸發方式、跨場景回退、選擇後不可回頭、讀檔後不可回溯、右側 2/3 維持前進，結果與上一筆完全一致。另以 4× DPI 近拍確認三個三角形邊緣銳利、水平排列、波浪方向朝左；桌機箭頭寬 29.4 px（面板左緣 +20.2 px 起），手機 21.8→51.2 px、台詞左緣 57.0 px，皆無重疊。主控台僅有沙箱代理阻擋 Google Fonts 的 `ERR_CERT_AUTHORITY_INVALID`（與本次變更無關）。

## Claude-20260917-0155

- 時間：2026-09-17T01:55:00Z
- 分支或 PR：`claude/elegant-wozniak-evo2rc`
- 已讀對方紀錄：`ChatGPT-20260916-2159`（無更新的新紀錄）
- 本次範圍：撤回 `Claude-20260917-0150` 的越界變更，箭頭改回字型字元 `◀`。
- 實際變更檔案：`src/ui/render.ts`、`src/style.css`（兩檔還原為 `3a6abc3` 的狀態，僅補一行註解）、`docs/ai-handoff/CLAUDE.md`
- 越界說明與更正：`Claude-20260917-0150` 把箭頭從字型字元改成 Claude 自己設計的 inline SVG 三角形（含形狀、尺寸、間距與留白調整）。依 `docs/AI_ROLE_BOUNDARIES.md`，元件外觀、字體與視覺狀態屬於 ChatGPT 的 UI 視覺設計責任，使用者當時的指示是「不用圖片、不要去要素材」，並不是授權 Claude 重新設計箭頭的視覺形式。該筆屬於越界，已由使用者指正並全數還原：
  1. 箭頭回到字型字元 `◀`（與右側前進提示 `▼` 同一套做法），移除 `BACK_ARROWS` 的 inline SVG 與 `.back-arrow` 樣式。
  2. 對話框左側留白回到 1.9rem。
  3. `src/style.css` 只多留一行註解，標明箭頭刻意使用字型字元，避免日後又被「優化」成 SVG。
- 已定案事項：回上一句的互動與行為（左側 1/3 點擊區、`ArrowLeft`、箭頭按鈕、選擇後清空回溯紀錄）維持 `Claude-20260917-0045` 的實作不變，本次只動視覺呈現的還原。
- 交給 ChatGPT：
  1. `property/ui.json` 缺 `backLabel`（左側箭頭按鈕的螢幕閱讀器標籤），目前落在程式預設值「回到上一句」。
  2. **箭頭的視覺規格請由 ChatGPT 定案**。目前是 Claude 為了讓功能可用而擺上的最小呈現：字型字元 `◀` ×3、青色（`var(--teal)`，hover／focus 轉 `var(--amber)`）、字級 0.58rem、字元間距 0.06rem、由右至左依序亮起並微微左移的波浪動畫，貼齊對話框左緣並垂直置中。字元、字級、顏色、間距與動畫節奏若要調整，請給規格，Claude 照做；Claude 不再自行更動箭頭的視覺形式。
- 未決問題或阻塞：無。
- 驗證結果：`npm run typecheck`、`npm test`（9 檔 78 測試）、`npm run build` 全數成功。Chromium 實機重跑同一份逐項檢查（桌機 1280×800 與手機 390×844）：箭頭字元回到 `◀◀◀`、三種觸發方式、跨場景回退不重播轉場卡、選擇後不可回頭、讀檔後不可回溯、右側 2/3 維持前進，結果與 `Claude-20260917-0045` 完全一致。主控台僅有沙箱代理阻擋 Google Fonts 的 `ERR_CERT_AUTHORITY_INVALID`（與本次變更無關）。

## Claude-20260917-0205

- 時間：2026-09-17T02:05:00Z
- 分支或 PR：`claude/elegant-wozniak-evo2rc`（PR #22 已合併，本分支自最新 `main` 重新拉出）
- 已讀對方紀錄：`ChatGPT-20260916-2159`（無更新的新紀錄）
- 本次範圍：依使用者指示，把回上一句的箭頭移到與右側前進提示 `▼` 同高的位置。
- 實際變更檔案：`src/style.css`、`docs/ai-handoff/CLAUDE.md`
- 已定案事項：
  1. 箭頭原本垂直置中於對話框（`top:50%`），改為與 `▼` 對齊。兩個提示共用 `.dialogue` 上的 `--hint-bottom`（距底 .1rem）與 `--hint-size`（▼ 字級 .85rem），`▼` 的視覺中心落在距底 `--hint-bottom + --hint-size / 2`。
  2. 回溯按鈕保留 1.4rem 高度方便點擊，`bottom` 以 `calc(var(--hint-bottom) + (var(--hint-size) - var(--back-hint-height)) / 2)` 把自己的中心推回同一條線，因此兩邊字級不同仍然同高；不是寫死的數字，日後調整任一邊的字級或距底只需改變數。
  3. 此為使用者直接指示的版位調整，非 Claude 自行決定的視覺設計；箭頭的字元、字級、顏色與動畫維持不變，仍由 ChatGPT 定案。
- 交給 ChatGPT：與 `Claude-20260917-0155` 相同，`property/ui.json` 的 `backLabel` 仍未補（目前落在程式預設值「回到上一句」）；箭頭視覺規格仍待 ChatGPT 定案。
- 未決問題或阻塞：無。
- 驗證結果：`npm run typecheck`、`npm test`（9 檔 78 測試）、`npm run build` 全數成功。Chromium 實機停掉動畫後量測兩個提示的視覺中心：桌機 1280×800 為 752.20 vs 752.22 px、手機 390×844 為 735.55 vs 735.56 px，差距 0.02 px（次像素捨入），並以截圖確認外觀對齊。另補記 PR #22 的部署驗收：GitHub Actions run #28 的 `typecheck`／`test`／`vite build --base=/employee-conversation-galgame/`／`deploy-pages` 全綠（40 秒完成）；本機以相同指令重現 base-path build，首頁與 `/favicon.ico` 皆回 200。線上站台 `likisila.github.io` 在本執行環境被出口政策阻擋（403），未能親自點擊驗收。

## Claude-20260917-0225

- 時間：2026-09-17T02:25:00Z
- 分支或 PR：`claude/elegant-wozniak-evo2rc`（PR #23 已合併，本分支自 `main` 重新拉出）
- 已讀對方紀錄：`ChatGPT-20260916-2159`（無更新的交接紀錄；但 `main` 已由 PR #24 加入 `public/assets/cutscenes/02_layoff_notification.mp4`，該次未留下 ChatGPT Entry，見下方待確認事項）
- 本次範圍：依使用者指示，把回上一句的箭頭釘在對話框最下方、位置固定。
- 實際變更檔案：`src/ui/render.ts`、`src/style.css`、`src/visual.css`、`docs/ai-handoff/CLAUDE.md`
- 已定案事項：
  1. 箭頭按鈕的 DOM 位置從 `.dialogue` 內移到 `.story-panel` 的直接子層，改以 `left`／`bottom` 釘在對話框左下角；高度固定 `--back-hint-height: 1.4rem`、距底固定 `--back-hint-bottom: .3rem`。不論台詞幾行、有沒有選項、面板多高，位置都不再變動。
  2. 修正前的實測：桌機一直在距面板底 31.8px，但手機版在出現選項時會從距面板底 100.4px 跳到 288.2px。修正後三種情境（一般台詞／換行數不同／選項頁）在桌機與手機都固定為距面板底 5.8px、高 22.4px、距面板左 5.8px。
  3. 連帶修掉一個實際缺陷：手機是單欄版面、選項直接排在對話框底部，箭頭釘到左下角後會壓在最後一個選項按鈕上（箭頭在上層，會吃掉該處的點擊）。已在 `visual.css` 的手機 media query 讓面板底部多留一條箭頭高度的空間。桌機是雙欄、選項在右欄，不會相撞，因此不動。
  4. 面板留白的擁有者是 `visual.css` 的 `--panel-pad`（該檔在 `style.css` 之後載入，`padding` 簡寫會蓋掉 `style.css` 的 `padding-bottom`），所以這條留白寫在 `visual.css`，不是 `style.css`。
- 交給 ChatGPT：
  1. `property/ui.json` 仍缺 `backLabel`（沿續 `Claude-20260917-0155`）。
  2. 箭頭視覺規格（字元、字級、顏色、間距、動畫）仍待 ChatGPT 定案。本次為使用者直接指示的版位調整。
  3. `.dialogue` 目前仍保留 1.9rem 的左側留白，那是箭頭還在對話區內時為了避免壓字而加的；箭頭移走後這段留白已無功能，只剩與右側 2rem 對稱的視覺效果。要保留或移除請 ChatGPT 決定，Claude 不自行更動。
- 未決問題或阻塞：PR #24 加入的過場影片沒有對應的 ChatGPT 交接紀錄，且目前引擎完全沒有影片播放能力（詳見下一筆）。
- 驗證結果：`npm run typecheck`、`npm test`（9 檔 78 測試）、`npm run build` 全數成功。Chromium 實機（桌機 1280×800、手機 390×844）確認位置固定如上；以 `elementFromPoint` 逐一檢查每個選項按鈕的四個角，修正前手機版有 1 個角被箭頭蓋住，修正後為 0；桌機修正前後都是 0。另比對改動前後的建置：橫向 740×420 有 6 個角落在面板可視範圍外，改動前後數字相同，屬既有的面板捲動行為，非本次造成。行為回歸（點箭頭、`ArrowLeft`、點左 1/3、選擇後箭頭消失）在兩種尺寸皆通過，無 pageerror。

## Claude-20260917-0255

- 時間：2026-09-17T02:55:00Z
- 分支或 PR：`claude/elegant-wozniak-evo2rc`
- 已讀對方紀錄：`ChatGPT-20260916-2159`（ChatGPT 交接紀錄無新 Entry）。另已讀 `main` 的 PR #24（`assets: add layoff notification cutscene`，加入 `public/assets/cutscenes/02_layoff_notification.mp4`）——**該次未在 `docs/ai-handoff/CHATGPT.md` 留下 Entry**，違反 `docs/AI_HANDOFF.md` 的「commit／PR 前必須追加一筆」。請 ChatGPT 補登，本筆先行記錄事實。
- 本次範圍：實作過場影片系統，完成 `coordination/handoff/HANDOFF-20260916-cutscene-integration.md`（owner: Claude、status 原為 TODO／HIGH）。
- 實際變更檔案：`property/cutscene-cues.json`（新增）、`property/manifest.json`、`src/ui/cutscene.ts`（新增）、`src/ui/keyboard.ts`（新增）、`src/ui/render.ts`、`src/domain/schema.ts`、`src/data/contentLoader.ts`、`src/data/saveStore.ts`、`src/engine/StoryEngine.ts`、`src/visual.css`、`src/vite-env.d.ts`、`tests/cutscenes.test.ts`（新增）、`tests/engine.test.ts`、`tests/history.test.ts`、`tests/saveStore.test.ts`、`README.md`、`coordination/handoff/HANDOFF-20260916-cutscene-integration.md`
- 先前狀態：影片素材進了 repo 也被 build 複製到 `dist/`，但 `src/` 對 `cutscene`／`video`／`mp4` 是零命中——沒有任何程式會播它。`parseManifest` 直接丟棄 `cutscenes` 與 `soraCutscenes` 兩個欄位。
- 使用者授權的兩項決策（UX 屬 Claude 範圍，已由使用者確認）：
  1. **對應表位置**：新增 Claude 維護的 `property/cutscene-cues.json`，不改寫 ChatGPT 維護的 `sora-cutscenes.json`。兩份的 `file` 與 `trigger` 是否一致由測試鎖住，避免漂移。對應依敘事層 scene 文件標題比對得出（scene-01 最終版→`s1-final-cut`、scene-05 收訖不等於同意→`s6-receipt` 等），非猜測。
  2. **播放控制**：可跳過（畫面點擊／Enter／空白鍵／Esc／右下角「跳過」按鈕）；已看過或已跳過的不重播，狀態進存檔快照，`restart()` 時清空以便重玩；預設帶聲音播放，另有靜音切換按鈕，偏好記在 `localStorage`。不做全域音量系統——專案其他地方沒有音訊，單為過場加一個全域開關反而不一致。
- 實作重點：
  1. 影片先在背景探測，確認 `loadedmetadata` 才蓋上畫面。9 段目前只有 1 段存在，若先鋪黑底再去載，玩家會在每個缺檔場景看到一次黑閃；先驗證再顯示就完全沒有這個過渡。
  2. 探測期間蓋一層透明的 `.cutscene-shield` 並接管鍵盤。這是實作過程中發現的真缺陷：否則玩家可以在待播影片底下繼續點擊，把劇情偷偷往前推。
  3. `sora-cutscenes.json` 已排除在 runtime 的 `import.meta.glob` 之外。它原本被整份打包進出貨的 JS（18KB 的 Sora prompt 與 style bible），卻沒有任何程式讀它。加上播放器之後 bundle 仍從 84.95 kB 降到 73.60 kB（gzip 27.43 → 22.82 kB）。
  4. 修掉 `SaveStore.parseEnvelope` 的漏欄位：它以白名單重建快照，`watchedCutscenes` 寫得進去卻讀不回來，導致讀檔後已看過的影片會重播。實機驗證時抓到。
  5. 修掉一個既有缺陷：畫面換掉後才送達的殘留選項點擊會讓 `engine.choose()` 拋出未處理例外，改為忽略。
- 交給 ChatGPT：
  1. **補登 PR #24 的交接紀錄**（見上）。
  2. **其餘 8 支 MP4 尚未生成**：`sora-cutscenes.json` 宣告 9 段且全部 `status: READY`，但 `public/assets/cutscenes/` 只有 `02_layoff_notification.mp4`。缺檔目前會安靜跳過，不影響遊玩；影片放進來即自動生效，不需要改程式。
  3. `property/ui.json` 需補四個標籤的正式文案，目前都落在程式預設值：`backLabel`（回到上一句）、`skipCutsceneLabel`（跳過）、`muteCutsceneLabel`（靜音）、`cutsceneLabel`（過場影片）。
  4. 箭頭與過場控制列的視覺規格仍由 ChatGPT 定案。
- 未決問題或阻塞：無。缺檔的 8 支影片在瀏覽器主控台會留下 404 訊息（屬預期，影片補齊後自然消失）；未改成 HEAD 預檢，因為那會讓每段影片多一次請求。
- 驗證結果：`npm run typecheck`、`npm test`（10 檔 96 測試，新增 `tests/cutscenes.test.ts` 15 個案例：對應表與 sora manifest 的防漂移、READY 影片都有掛載點、場景存在且一場一片、四結局各一支互斥影片、單一路徑不重複遇到同一段、parser 的錯誤處理、已看過狀態的存讀）、`npm run build` 全數成功。Chromium 實機四種情境：(A) 缺檔 404 → 無黑閃、1.2 秒內進入場景、畫面正常；(B) 真檔但此環境 Chromium 無 H.264 解碼 → 同樣安靜跳過；(C) 以攔截回傳可播放的 WebM → 覆蓋出現、`currentTime` 前進、跳過與靜音按鈕可用、`aria-pressed` 正確、播完自動進場景、回上一句再前進不重播；(D) Esc 跳過、靜音偏好寫入 `localStorage`、重新載入讀檔不重播。主控台除缺檔 404 與沙箱擋掉的 Google Fonts 憑證外無錯誤。**限制：Playwright 內附的 Chromium 不支援 H.264（`canPlayType('video/mp4; codecs="avc1.42E01E"')` 回空字串），因此真實 MP4 的解碼播放無法在本環境親自驗證，播放路徑是以同 URL 攔截回傳 WebM 驗證的。**

## Claude-20260917-0405

- 時間：2026-09-17T04:05:00Z
- 分支或 PR：`claude/blissful-euler-3q2stv`（自最新 `main` `180c16a`）
- 已讀對方紀錄：`ChatGPT-20260916-2159`（ChatGPT 交接紀錄無新 Entry；`Claude-20260917-0255` 請 ChatGPT 補登 PR #24 的交接紀錄一事仍未處理，本筆再次提醒）
- 本次範圍：依使用者需求「通關後頁面可以自由選擇回到之前的決策點」，新增結局畫面的決策點選單與引擎的決策點回溯。
- 實際變更檔案：`src/engine/StoryEngine.ts`、`src/data/saveStore.ts`、`src/domain/schema.ts`、`src/ui/render.ts`、`src/visual.css`、`tests/decisionPoints.test.ts`（新增）、`tests/saveStore.test.ts`、`tests/engine.test.ts`、`README.md`、`property/README.md`、`docs/technical/save-load.md`、`docs/ai-handoff/CLAUDE.md`
- 已定案事項：
  1. `StoryEngine` 新增 `decisions`：每次 `choose()` 在套用效果「之前」記下 `{ sceneId, lineIndex, state, choiceId }`。這與既有的逐句回溯紀錄（`history`，選擇後清空）是兩回事，決策點整輪保留。
  2. 新增 `decisionPoints`（唯讀複本）與 `rewindTo(index)`：場景、停在哪一句與所有狀態數值都還原成按下該選項之前，該決策點與其後的紀錄一併作廢，並清空 `history`（否則會一句一句退進已作廢的那條路）。索引不合法時不動作。
  3. 已看過的過場影片不因回到決策點而重設——那是續玩同一輪；只有 `restart()` 會清空。`restart()` 同時清空決策點。
  4. 決策紀錄進存檔（`StorySnapshot.decisions`），所以通關後關掉瀏覽器再回來，「繼續上次」仍回得到任一決策點。存檔版本不變：舊存檔沒有這個欄位時只是不顯示按鈕。`SaveStore` 對此欄位的驗證是「任一筆壞掉就整個欄位忽略」，因為決策點是一條有序路徑，挑著留會讓索引錯位。內容改版導致對不上的紀錄，`restore()` 從該筆起截斷。
  5. UI：結局畫面的「重新開始」下方多一顆「回到決策點」（這一輪沒有做過選擇時不顯示）。點開是蓋在結局畫面上的浮層，列出每個決策點的場景標題與當時選的選項全文；點任一項就跳回去，並重播該場景的轉場卡，讓玩家知道自己被送到哪一場。浮層可用 Esc、「關閉」或點外圍關閉，焦點限制在浮層內、關閉後回到開啟按鈕；浮層開著時 Enter／空白鍵／左方向鍵都不會推進底下的劇情。
  6. 跳回去之後會立刻重新存檔，重新載入不會又回到結局。
- 交給 ChatGPT（依角色邊界，Claude 不自行定案正式文案與視覺規格）：
  1. **`property/ui.json` 需補四個新標籤的正式文案**，目前落在程式預設值：`rewindLabel`（回到決策點）、`rewindPrompt`（回到哪一個決策點？）、`rewindChoiceLabel`（你選了：）、`rewindCloseLabel`（關閉）。`parseUi` 已支援，補進 JSON 即生效。
  2. **決策點選單的視覺規格待定案**。目前是 Claude 為了讓功能可用而擺上的最小呈現，完全沿用既有元件：選項卡用 `.choice`、關閉鍵用 `.secondary-action`、面板底色用對話框的 `--surface`，只多了半透明遮罩與「場景標題（青色小字）＋選項全文」的兩行排版。字級、間距、遮罩濃度、是否改成整頁列表或時間軸等，請給規格，Claude 照做。
  3. **沿續前幾筆仍未關閉的項目**：`property/ui.json` 的 `backLabel`、`skipCutsceneLabel`、`muteCutsceneLabel`、`cutsceneLabel` 仍缺正式文案；回上一句箭頭與過場控制列的視覺規格仍待定案；PR #24 的 ChatGPT 交接紀錄仍未補登。
  4. **是否要在結局畫面加一行說明**（例如「可以回到任何一個決策點重新選擇」）由 ChatGPT 決定；目前畫面上只有按鈕本身，沒有額外說明文案。
- 未決問題或阻塞：無。
- 驗證結果：`npm run typecheck`、`npm test`（11 檔 111 測試；新增 `tests/decisionPoints.test.ts` 12 個案例涵蓋「決策點的記錄內容」「回到決策點後狀態與句子還原」「較早的決策點作廢後續紀錄」「改選走到另一個結局」「回去後不能再逐句退回舊路」「索引不合法」「過場影片狀態」「重新開始清空」「快照往返」「回傳值為複本」「壞掉的紀錄截斷」，`tests/saveStore.test.ts` 另加 3 個決策點存檔案例）、`npm run build` 全數成功。Chromium 實機（桌機 1280×800、手機 390×844）各跑一次完整流程：從標題玩到 TRUE END → 結局畫面出現按鈕 → 選單列出 5 個決策點（場景標題與選項全文正確）→ Esc／點遮罩／「關閉」三種關法都回到原本的結局畫面且焦點回到按鈕 → 選單開著時點面板、按 Enter、按左方向鍵都不會推進劇情 → 點第 2 個決策點跳回「三個人的一對一」的選項頁（先播轉場卡、沒有回上一句箭頭）→ 重新載入「繼續上次」仍在同一場 → 改選另一項走到結局後清單重建為 5 筆 → 通關後重新載入仍看得到選單 → 「重新開始」後新的一輪不顯示按鈕。另在 740×420 確認選單面板超出畫面時會自行捲動、Tab／Shift+Tab 在浮層內循環，三種尺寸都沒有水平溢出。主控台僅有沙箱代理阻擋 Google Fonts 的 `ERR_CERT_AUTHORITY_INVALID`（與本次變更無關）。

## Claude-20260917-0517

- 時間：2026-09-17T05:17:00Z
- 分支或 PR：`claude/blissful-euler-3q2stv`
- 已讀對方紀錄：`ChatGPT-20260916-2159`（無新紀錄）
- 本次範圍：依使用者指示「PR 要上去，不然 GPT 看不到」，把「完成後必須開 PR」寫進兩邊的代理指令與交接協定。
- 實際變更檔案：`AGENTS.md`、`CLAUDE.md`、`docs/AI_HANDOFF.md`、`docs/ai-handoff/CLAUDE.md`
- 已定案事項：
  1. 兩邊的入口指令（ChatGPT 的 `AGENTS.md`、Claude 的 `CLAUDE.md`）各加一節「完成後必須開 PR」，流程一致：先追加自己的交接紀錄 → commit → `git push -u origin <branch>` → 立刻開 PR → 回覆使用者時附上 PR 連結。沒有 PR 連結的工作一律視為未完成。
  2. `docs/AI_HANDOFF.md` 新增「開 PR（交接的送達方式）」一節：交接紀錄寫了但沒開 PR，對方讀不到，交接不算送達；PR 內文至少包含本次 Entry ID、實際變更檔案、交給對方的明確行動、驗證結果；對方回覆時應引用該 PR。
  3. 這次修改的是分工／交接規則本身，依 `docs/AI_ROLE_BOUNDARIES.md` 第 7 條，屬使用者明確要求，非 Claude 自行變更。
- 交給 ChatGPT：
  1. 請依新規則照辦：往後每次更新都要開 PR，並在 PR 內文附上自己的 Entry ID。
  2. `Claude-20260917-0405` 交出的四個新 UI 標籤文案（`rewindLabel`、`rewindPrompt`、`rewindChoiceLabel`、`rewindCloseLabel`）與決策點選單的視覺規格仍待定案；PR #24 的交接紀錄仍未補登。
- 未決問題或阻塞：無。
- 驗證結果：本次只改 Markdown 指令文件，不影響程式；`npm run typecheck`、`npm test`（11 檔 111 測試）、`npm run build` 於同一分支已全數通過（見 `Claude-20260917-0405`）。

## Claude-20260917-0755

- 時間：2026-09-17T07:55:00Z
- 分支或 PR：`claude/blissful-euler-3q2stv`（PR #26，已合入 PR #27）
- 已讀對方紀錄：`ChatGPT-20260917-0536`（逐項回覆如下）
- 本次範圍：合併 ChatGPT 的交接分支，處理它交回的兩項修正要求，並依 `property/VISUALS.md` 新增的「互動控制元件規格」完成控制元件外觀整合。
- 實際變更檔案：`src/engine/StoryEngine.ts`、`src/ui/icons.ts`（新增）、`src/ui/render.ts`、`src/ui/cutscene.ts`、`src/style.css`、`src/visual.css`、`tests/decisionPoints.test.ts`、`AGENTS.md`、`CLAUDE.md`、`docs/AI_HANDOFF.md`、`docs/ai-handoff/CLAUDE.md`
- 逐項回覆 `ChatGPT-20260917-0536`：
  1. **決策點的內容改版驗證 — 完成。** `validDecisionPrefix()` 改為呼叫新的 `isDecisionUsable()`，除了場景與選項 ID 還在之外，另外檢查兩件事：該選項在紀錄當時的狀態下仍然可選（`isChoiceAvailable`，選項條件改過就失效），以及紀錄的句子仍是該場在當時狀態下的最後一句（`decision.lineIndex === 可見台詞數 - 1`，場景加了或刪了台詞就對不上）。任一項不成立即從該筆起截斷。新增兩個測試：「決策場景後來增加台詞」（舊紀錄失效、指向新最後一句的紀錄仍可用且回去後停在新句子並看得到選項）與「選項條件改成在當時狀態下不可選」（失效；條件成立時保留）。
  2. **PR 規則 — 完成。** `AGENTS.md`、`CLAUDE.md`、`docs/AI_HANDOFF.md` 三處同步改寫：有檔案變更才必須 push；分支尚無 PR 才建立，已有 PR 就更新同一個 PR、不另開新的；純審查、回答或沒有檔案變更的工作不開空 PR，回覆寫在交接紀錄或既有 PR 留言。
  3. **控制元件外觀 — 完成**（依 `property/VISUALS.md`）：
     - 新增 `src/ui/icons.ts`，集中產生線框 inline SVG（20×20、線寬 1.75、圓角端點、`currentColor`），讓回上一句與過場控制列共用同一套筆畫參數。
     - 回上一句：三個字型字元 `◀◀◀` 改為單一線框左箭頭；按鈕 44×44、圖示 20×20、平常 `--teal`、hover／focus `--amber`；移除無限循環動畫，改成只有箭頭「這次才出現」時播一次 180 ms 淡入（renderer 以 `backHintShown` 判斷，否則每前進一句都會重播）；`prefers-reduced-motion` 不播。`.dialogue` 只為避開箭頭而存在的 1.9rem 左側留白已移除。
     - 過場控制列：靜音鍵與跳過鍵改用線框 Speaker／Speaker Slash／Skip Forward 圖示，移除 `🔊`／`🔇`／`▶▶`；膠囊底色改 `rgba(8,21,29,.78)`、模糊 8 px、按鈕至少 44×44、間距 8 px、距 safe area 16 px；狀態切換只有 160 ms 顏色與背景變化。焦點順序維持「靜音 → 跳過」。
  4. ChatGPT 對決策點選單 UX 的接受與「結局畫面不加說明句」的決定：**收到，維持現狀不動**。
- 實作過程中修掉一個自己造成的回歸：靜音鍵換圖示時會重建按鈕內容，事件冒泡到覆蓋層時原本的點擊目標已被拔離按鈕，`closest('button')` 找不到祖先而誤判成「點背景」，一按靜音就把影片跳掉。已在 `.cutscene-controls` 上擋下冒泡並註明原因。這是實機驗證抓到的，單元測試涵蓋不到。
- 交給 ChatGPT：
  1. 無新的待辦。`property/ui.json` 的八項正式文案已全部生效，程式預設值不再出現在畫面上。
  2. `sora-cutscenes.json` 宣告的其餘 8 支 MP4 仍未生成（沿續既有事項，缺檔會安靜跳過，不阻擋遊玩）。
- 未決問題或阻塞：無。
- 驗證結果：`npm run typecheck`、`npm test`（11 檔 113 測試，較上一筆 +2 為本次新增的內容改版案例）、`npm run build`、`git diff --check` 全數通過。Chromium 實機（桌機 1280×800、手機 390×844）：
  - 箭頭：按鈕 44×44、圖示 20×20、`stroke-width` 1.75、圓角端點、預設 `rgb(120,174,183)`、hover `rgb(232,183,95)`、`aria-label`「回到上一句」取自 `ui.json`；逐句追蹤 13 個畫面確認淡入只在箭頭出現的那一次播放（轉場卡後再次出現時也只播一次），其餘每一句都不重播；與台詞矩形零重疊，手機版選項按鈕四角被遮住的數量為 0。
  - 過場控制列（以攔截回傳可播放的 WebM 驗證，本環境 Chromium 不支援 H.264）：靜音 44×44、跳過 92×44（手機 85×44）、間距 8 px、距右下 16 px、底色 `rgba(8,21,29,.78)`、`blur(8px)`、`transition` 只有 border-color／background／color 各 160 ms、圖示 20 px／1.75 線寬、控制列內無任何 emoji 或字型符號、Tab 順序為靜音→跳過；按靜音後 `aria-pressed=true`、影片繼續播放（`currentTime` 前進）、偏好寫入 `localStorage`、圖示換成 Speaker Slash；按跳過正常回到遊戲畫面。
  - 決策點流程回歸：五個決策點、Esc／遮罩／關閉三種關法、跳回第 2 個決策點、讀檔續玩、改選重建清單、通關後讀檔仍可用、重新開始後按鈕消失，全部與 `Claude-20260917-0405` 一致；選單文案已換成 `ui.json` 的「想回到哪個決策點？」「當時選擇：」「關閉」。主控台僅有沙箱代理阻擋 Google Fonts 的憑證錯誤。

## Claude-20260917-0830

- 時間：2026-09-17T08:30:00Z
- 分支或 PR：`claude/blissful-euler-3q2stv`（PR #26 已合併，本分支自最新 `main` `db1280f` 重新拉出）
- 已讀對方紀錄：`ChatGPT-20260917-0536`（已於 `Claude-20260917-0755` 逐項回覆完畢）。另注意到 `main` 上的 PR #28（曾雅琳淺色髮型與服裝設定）已合併，屬 ChatGPT 的素材與正典更新，本次未觸碰。
- 本次範圍：修正使用者回報的「通關後回到決策點沒有生效」。
- 實際變更檔案：`src/engine/StoryEngine.ts`、`tests/decisionPoints.test.ts`、`README.md`、`docs/technical/save-load.md`、`docs/ai-handoff/CLAUDE.md`
- 問題與判斷：
  1. 重現結果：以 `main` 的正式 build 實測，**全新一輪**玩到結局，「回到決策點」正常出現、5 筆決策點正確；**功能上線前存的舊檔**接續玩到結局則不顯示按鈕。使用者遇到的是後者——瀏覽器裡的存檔是更新前寫的，沒有 `decisions` 欄位。
  2. 這是 `Claude-20260917-0405` 的設計決定（舊存檔就不顯示按鈕，視為優雅降級）。但對實際玩家而言，更新後打開遊戲看到的就是「功能沒生效」，而且每一位既有玩家都會遇到。判斷為我的設計失誤，不是可接受的降級。
- 已定案事項（修正方式）：
  1. `restore()` 在決策紀錄為空時（舊存檔沒有此欄位，或因內容改版被截斷成空），改為**從存檔狀態反推這一輪走過的路徑**：由 `startScene` 窮舉所有選擇組合，找出「停在存檔場景、狀態完全相同」的路徑，據此重建決策點。
  2. **只有恰好一條路徑對得上才採用。** 兩條以上代表這個狀態推不出唯一的歷史，寧可不顯示，也不要列出玩家沒做過的選擇；零條（存檔被改過、內容已改版）同樣不採用。已用程式確認目前正典的 243 條路徑，其（結局場景＋最終狀態）全部唯一，因此所有既有存檔都推得回來。
  3. 窮舉設節點上限 `REBUILD_NODE_LIMIT = 20000`，將來內容長大時走不完就當作推不出來，不會讓讀檔卡住。反推只讀資料、不拋例外（新增純函式版的 route 解析 `settledSceneId()`），資料有問題時退化為「推不出來」。
  4. 連帶讓「內容改版導致決策紀錄被截斷」的情況也能自動修正：原本截斷後就沒有決策點，現在會反推出同一條路徑並把句子位置更新到改版後的最後一句。`tests/decisionPoints.test.ts` 內對應的斷言已從「截斷成空」改為「修正成新的位置」，並在測試中註明原因。
- 交給 ChatGPT：無新增待辦。既有事項：`sora-cutscenes.json` 宣告的其餘 8 支 MP4 仍未生成。
- 未決問題或阻塞：無。
- 驗證結果：`npm run typecheck`、`npm test`（11 檔 120 測試，新增 7 個反推案例：正確反推、反推後可跳回去重選、與實際遊玩紀錄一致、歧義時不反推、狀態對不上時不反推、已有有效紀錄時不反推、還沒做過選擇時回空清單）、`npm run build` 全數通過。Chromium 以 `main` 正式 build 實測：玩完整一輪取得真實存檔 → 拿掉 `decisions` 模擬舊存檔 → 「繼續上次」讀檔 → 結局畫面出現「回到決策點」，列出的 5 筆與實際選過的 `invite-clear`／`notice-euphemism`／`answer-bargain`／`doc-protect`／`keep-credit` 完全一致，點第 4 筆正確跳回「收訖不等於同意」的選項頁。以正式內容量測反推耗時平均 1.10 ms（20 次平均），讀檔時間沒有可感差異。

## Claude-20260917-0845

- 時間：2026-09-17T08:45:00Z
- 分支或 PR：`claude/blissful-euler-3q2stv`（PR #30 已合併，本分支自最新 `main` `dbc2f1b` 重新拉出）
- 已讀對方紀錄：`ChatGPT-20260917-0807`（曾雅琳淺色外觀正典與全身透明素材規格，已讀，無需程式回應）、`ChatGPT-20260917-0819`（十張全身透明 PNG，本筆處理其交辦）
- 本次範圍：把 PR #29 的原生透明全身角色 PNG 接進遊戲。
- 實際變更檔案：`src/domain/schema.ts`、`src/data/assetPath.ts`、`src/ui/presentation.ts`、`src/ui/render.ts`、`src/main.ts`、`property/images.json`、`property/README.md`、`tests/characterArt.test.ts`（新增）、`tests/contentLoader.test.ts`、`docs/ai-handoff/CLAUDE.md`
- 整合方式（`ChatGPT-20260917-0819` 交由 Claude 決定的部分）：
  1. **逐張載入，不在建置期組成 sprite sheet。** 十張都是 1024×1536 的原生 Alpha PNG，拼成 sheet 會重新編碼、也違反「不要覆寫本批 PNG」。改為擴充 schema：`images.json` 的 `expressions` 值若是**字串**就當成該表情自己的圖片路徑（逐張模式），若是**數字**則維持原本的畫格索引（sheet 模式）。同一個角色不可混用，載入時就擋下。
  2. 逐張模式在解析後 `columns` 恆為 1、畫格恆為 0，並多帶一個 `sources`（表情 → 路徑），所以 renderer 只需多問一次 `sources`，排版、表情切換、`align`、轉場與既有 CSS 全部沿用，沒有第二套繪製路徑。sheet 模式的資料與行為完全不變（舊 bust 圖仍可用同一份程式跑）。
  3. `resolveCatalogAssets` 一併解析 `sources` 的每個路徑，部署在 `/<repo>/` 子路徑時不會 404。
  4. **預載改為依表情取圖**：一個表情就是一張 1.2 MB 的圖，不能只載「角色的第一張」。現在場景指定表情的那位角色載指定的那張，其他出場者載各自的預設表情；sheet 模式兩種情況都回同一張整圖，行為不變。
  5. `frameAspectRatio` 設為 `0.6667`（1024÷1536）。既有 CSS 以 `aspect-ratio` ＋ `max-height:100%` 依舞台高度決定尺寸，因此全身圖自動變成「站在對話框上緣」的正常視覺小說版位，不需要改 CSS。
  6. 舊 bust sprite sheet 依 `ChatGPT-20260917-0819` 的指示保留在 repo 裡，只是 `images.json` 不再引用。要不要刪由 ChatGPT 決定。
- 交給 ChatGPT：
  1. **`s3-meeting`（三個人的一對一）的背景與全身圖尺度不合**：該背景是會議桌的近景特寫，全身立繪「腳踩在桌面上」。同一套做法在 `s1-final-cut` 的辦公室寬景看起來完全正確（周予安站在地板上，比例自然）。這是美術方向的取捨，請擇一：(a) 換一張有地板空間的會議室背景；(b) 指定這類近景場景改用「只露上半身」的裁切框（Claude 可加一個資料層的框選欄位，收到規格就實作）。我不自行決定裁切方式。已附實機截圖說明於 PR。
  2. **`images.json` 的 alt 文案已過期**：`zeng-yalin` 仍寫「肩長深髮、深色西裝外套」，但 `ChatGPT-20260917-0807` 已改為淺冷灰棕髮、淺灰米色外套。alt 屬文案，請 ChatGPT 更新（`lin-yucheng`、`zhou-yuan` 的描述我看過，與新圖一致）。
  3. **素材體積**：十張合計 12.5 MB（每張約 1.2 MB）。實測一次遊玩前段就下載 4.81 MB。若希望縮小，請 ChatGPT 提供同一批圖的 WebP 版本；我不會重新編碼或量化這批 PNG。
- 未決問題或阻塞：上述第 1 項在 ChatGPT 回覆前維持現狀（全身圖照常顯示，近景場景的尺度感偏怪）。不阻擋遊玩。
- 驗證結果：`npm run typecheck`、`npm test`（12 檔 128 測試，新增 `tests/characterArt.test.ts` 8 個案例：sheet 模式不受影響、逐張模式的解析結果、依表情取圖與未知表情的退路、子路徑解析、混用寫法報錯、預設表情缺圖報錯、表情不可為空、正式素材三位角色都是逐張且每個表情各一檔）、`npm run build` 全數通過；`tests/contentLoader.test.ts` 的素材存在性檢查改為同時涵蓋兩種寫法。Chromium 實機（桌機 1280×800、手機 390×844）：立繪比例 0.667 正確、無水平／垂直溢出、腳底貼齊對話框上緣、同場景內切換角色與表情時確實換圖（`lin-yucheng-alert.png`／`zeng-yalin-neutral.png`）、主控台無錯誤；一次遊玩前段共下載 4 張全身圖 4.81 MB。
