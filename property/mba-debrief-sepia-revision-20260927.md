# 「查看案例分析」Sepia 文案修訂（2026-09-27）

> 狀態：正式玩家文案與 Claude 接線規格。
>
> 課程定位：組織行為（OB），不是 HR 流程教學。

## 一、Sepia 診斷

檢查範圍：`property/mba-debrief.json`、四個結局、實際 Debrief 區塊與複製摘要。

參考聲音：四個結局的既有寫法——短句、具體主詞、承認損失，不替角色找漂亮結論。例如「謝謝你把程序說完。不是謝謝這個決定。」與「不要把『之後』也排進今天的議程。」

修訂前的主要問題：

1. **太像教科書摘要。** 「高資訊透明」「非預期後果」「可替代做法」等抽象名詞連續出現，讀者知道分類，卻聽不到誰做了什麼。
2. **格式過度整齊。** 理論都用同一種定義句；替代方案都用「改善是……代價是……」；因果鏈每條都是四段箭頭。資訊正確，但像模板輸出。
3. **中英混寫沒有必要。** `trade-off`、`Compliance`、`trust`、`voice` 出現在解釋句裡，像課堂投影片，不像一位老師針對這次選擇說話。英文只保留在正式理論名稱。
4. **主詞常被抽掉。** 「成本外部化」「關係修復不足」沒有說清楚是公司、予安或雨澄在做什麼、承擔什麼。
5. **結論太圓。** 每段都有完整的「機制—改善—代價」，少了本作應有的立場：有些損失不能解決，有些界線不能拿善意交換。
6. **用數字預告文章結構。** 「下面只回答三件事」是在替版面報幕，不是在回應剛結束的談話；已改成直接指出本頁真正要追問的差別——哪些話把選擇留給雨澄，哪些只是讓主管自己好受一點。

Sepia 判定：問題形成群聚，不適合只換幾個詞；採 **recreate**，保留所有分數、理論判斷與事實，重寫玩家可見文案。

## 二、已完成的內容修訂

`property/mba-debrief.json` 已重寫以下純內容欄位，沒有變更分數、ID、條件、路由或 schema：

- 入口說明與八個區塊標題。
- trade-off 與案例限制。
- 十五個主要選項的路徑證據。
- 四位 stakeholder 的權力、目標、資訊與風險描述。
- 十七個 OB 理論的白話解釋。
- 四個結局的策略判讀、四方結果、延遲後果與理論重點。
- 八個替代做法。

入口正式文案：

> 先別急著替這場談話打分。回頭看剛才幾句話：哪些把選擇留給雨澄，哪些只是讓主管自己好受一點。

語氣原則：先寫角色或公司做了什麼，再說理論；能用「雨澄」「予安」「雅琳」「公司」就不用抽象名詞當主詞；英文只留在正式理論名稱。

## 三、Claude 需替換的硬編碼畫面文案

以下文字目前寫在 `src/ui/render.ts` 或 `src/domain/mba.ts`，不在內容 JSON 內。請逐字替換；若要新增 copy key 或調整資料位置，由 Claude 決定。

| 現況 | 正式替換文案 |
|---|---|
| `在這條路徑中：` | `套回你剛才的選擇：` |
| `替代策略 1`／`替代策略 2` | `做法一`／`做法二` |
| `改善：` | `它能改變：` |
| `代價：` | `要付出的代價：` |
| `這條路徑未建立足以穩定此維度的行為證據` | `這五次選擇沒有留下足夠證據，不能只靠其中一句判斷。` |

分析頁主標題由：

> `{結局名稱} — 查看案例分析`

改為：

> `{結局名稱}｜案例分析`

### 零分混合證據

不要再顯示：

> 正向行為被另一個選擇抵銷：{正向證據}；但{負向證據}

正式句型：

> 一邊是「{正向證據}」，另一邊是「{負向證據}」。兩個選擇互相抵銷，所以這一項仍不穩定。

帶入引號前，請移除證據句末的句號，避免引號內外重複標點。

### 因果鏈

目前的四段箭頭像報表：

> 選項原句 → 路徑證據 → 某維度提升／降低 → 結局延遲後果

改為可直接讀出的三句：

> 你當時說：「{選項原句}」  
> {路徑證據}  
> 這一步讓{維度}{提升／降低}。放回整條路徑看，{結局延遲後果}

必須保留「這一步」與「放回整條路徑看」的區分。正向選擇出現在負面結局時，它只是減少部分傷害，不能寫成它直接造成了負面結局。畫面可以保留三行，也可以由 Claude 決定語義標記；不可再顯示箭頭串。

## 四、理論必須跟著實際選項，不跟著題號整包帶入

目前 `choiceTheories` 以 `choice1`…`choice5` 分組，玩家只要在文件題選了「催簽」，頁面仍會列出主要用來解釋私人補償的 Equity Theory／公平理論；這會教錯。改為依十五個實際選項 ID 映射：

| 選項 ID | 可用理論，依優先順序 |
|---|---|
| `invite-clear` | Informational Justice、Uncertainty Management |
| `invite-vague` | Uncertainty Management、Informational Justice |
| `invite-goodnews` | Psychological Contract、Informational Justice、Impression Management |
| `notice-direct` | Informational Justice、Interpersonal Justice、Attribution Theory |
| `notice-euphemism` | Impression Management、Informational Justice、Attribution Theory |
| `notice-performance` | Attribution Theory、Interpersonal Justice、Psychological Safety |
| `answer-admit` | Locus of Control、Employee Voice、Procedural Justice、Ethical Leadership |
| `answer-deflect` | Emotional Labor、Impression Management、Interpersonal Justice |
| `answer-bargain` | Employee Voice、Power-Dependence、Ethical Leadership、Procedural Justice |
| `doc-protect` | Procedural Justice、Employee Voice、Locus of Control |
| `doc-pressure` | Procedural Justice、Power-Dependence、Psychological Safety |
| `doc-private` | Power-Dependence、Social Exchange、Equity Theory、Agency Problem |
| `keep-advocate` | Ethical Leadership、Social Exchange、Leader–Member Exchange |
| `keep-credit` | Social Exchange、Leader–Member Exchange、Emotional Labor |
| `keep-confess` | Power-Dependence、Social Exchange、Ethical Leadership、Psychological Safety |

畫面固定顯示 **三個** 理論，不再顯示五個長段落。選取順序：

1. 先依本路徑影響最大的選項排序。
2. 每個選項先取表中第一個尚未出現的理論；能從三個不同選項各取一個時，不要讓同一選項包辦三個。
3. 結局有辨識度較高的理論時優先：END 02 為 Social Exchange／Procedural Justice／Leader–Member Exchange；END 03 為 Informational Justice／Impression Management／Emotional Labor；END 04 為 Power-Dependence／Social Exchange／Agency Problem。TRUE END 依實際三個最強正向選擇取值，不另硬塞固定名單。
4. `套回你剛才的選擇` 必須引用真正帶入該理論的那個選項證據，不能共用同一題的泛用證據。

## 五、複製摘要正式標題

`formatDebriefSummary()` 內的標題改為：

| 現況 | 正式替換文案 |
|---|---|
| `《最後一次一對一》案例摘要 — {結局}` | `《最後一次一對一》案例分析｜{結局}` |
| `管理路徑：` | `你做過的五次選擇：` |
| `組織狀態：` | `這些選擇留下的狀態：` |
| `利害關係人結果：` | `最後，誰承擔了什麼：` |
| `理論鏡頭：` | `用組織行為再看一次：` |
| `在這條路徑中：` | `套回你剛才的選擇：` |
| `換一種做法：` | `如果重來一次：` |
| `方案 N 改善：` | `做法 N 能改變：` |
| `方案 N 代價：` | `做法 N 要付出的代價：` |

複製摘要必須保留五個原始選擇，因為使用者可能拿去做課程反思；畫面可不顯示這一區，但輸出不能刪。

## 六、驗收

1. 四個結局都要實機開啟分析，不能只驗 TRUE END。
2. 玩家畫面不再出現 `trade-off`、`Compliance`、`trust`、`voice` 等非理論名稱的英文插入。
3. 因果鏈沒有箭頭串；正向選擇不會被寫成直接造成負面結局；理論段落不再使用「在這條路徑中」。
4. 兩套做法分別顯示「它能改變」與「要付出的代價」。
5. 零分混合證據讀起來是兩個選擇互相抵銷，不像錯誤訊息。
6. 桌機與 390×812 手機版檢查長句換行；不得水平溢出。
7. 複製摘要與畫面使用同一套新語氣，且仍包含原始五個選擇。
8. 每條路徑只顯示三個理論；`doc-pressure` 不得再帶出 Equity Theory，理論證據必須來自對應的實際選項。
