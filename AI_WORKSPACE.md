# AI Workspace — GPT × Claude

> **所有 AI 在開始工作前都必須先閱讀本檔。**
>
> 本檔是 `employee-conversation-galgame` 的 AI 協作契約，用來讓 GPT 與 Claude 同時工作時維持一致的故事、角色、素材與程式介面，並避免互相覆蓋工作。

## 1. Project Goal

建立一個「與員工進行職場對談」主題的 Gal Game / Visual Novel。

核心原則：

- 劇情、角色名稱、對話、場景、選項、數值與素材路徑都必須由資料驅動，不得 hard-code 在 UI 或遊戲邏輯中。
- TypeScript 為主要程式架構。
- `property/` 保留為非技術內容與遊戲資料的主要來源之一。
- GPT 與 Claude 可以平行工作，但必須遵守下方 ownership 與 handoff 規則。

---

## 2. Responsibility Split

### GPT — Creative / Narrative / Visual Owner

GPT 負責所有「非技術面」工作的主要產出與驗證，包括：

- 故事世界觀與主題
- 劇情架構、章節、節點與分支
- 對話內容、選項與情緒節奏
- 角色設定、人物一致性、關係與語氣
- 劇情邏輯檢查與 continuity review
- 分支是否合理、是否出現角色 OOC
- 遊戲體驗與敘事層面的 UI/UX 建議
- Image generation
- 角色去背 PNG
- 表情 / pose variations
- 場景背景圖
- 對話框與非功能性 UI visual assets
- loading / transition / title / ending visuals
- image prompt、asset naming 與 visual consistency
- 驗證 Claude 實作後是否符合原始故事與角色意圖

GPT **不負責主要程式開發**。除非為了定義資料 schema、範例資料或協助說明需求，不應主動重構 Claude 的程式碼。

### Claude — Engineering Owner

Claude 負責所有程式開發與技術實作，包括：

- TypeScript 專案架構
- gameplay engine
- route / state / save-load
- dialogue renderer
- branching logic
- component implementation
- animation implementation
- asset loading
- schema validation
- build / lint / tests
- responsive implementation
- performance
- deployment-related code
- 將 GPT 提供的 story / character / asset definitions 接入遊戲

Claude **不得自行改寫已核准的故事、角色性格、對話含義或美術設定**。若技術限制需要調整，建立 handoff request，而不是直接改內容。

---

## 3. Ownership by Repository Area

以下是預設 ownership。尚未存在的資料夾可在需要時建立。

| Path / Area | Primary Owner | Notes |
|---|---|---|
| `src/`, `app/`, `components/`, `lib/` | Claude | 程式實作 |
| build/config files | Claude | package、tsconfig、lint、CI 等 |
| `property/characters/` | GPT | 角色資料與角色設定 |
| `property/story/` | GPT | 劇情、節點、分支、對話 |
| `property/scenes/` | GPT | 場景定義與敘事需求 |
| `property/assets/` | GPT | 素材 manifest、prompt、用途、狀態 |
| `public/assets/generated/` | GPT | 生成素材；Claude 只負責引用 |
| schema / types for `property/` | Claude | 技術 schema 由 Claude 維護，但不可改變內容語意 |
| `docs/narrative/` | GPT | 世界觀、故事框架、角色 bible |
| `docs/technical/` | Claude | 工程文件 |

### Shared Interface Rule

`property/` 是 GPT 與 Claude 的主要交界面：

- GPT 決定「內容是什麼」。
- Claude 決定「程式如何安全讀取內容」。
- Claude 可以新增 schema 欄位需求，但不得偷偷改掉既有內容語意。
- GPT 修改資料格式前，必須先確認不會破壞既有 schema；若會破壞，先提出 handoff。

---

## 4. No-Hard-Code Contract

以下內容不得直接 hard-code 在 UI component 或 gameplay flow 中：

- character names
- dialogue text
- choice text
- scene titles
- relationship values
- emotion labels
- character image paths
- background image paths
- story branch IDs
- endings
- chapter names
- UI text that belongs to game content

這些資料應由 `property/` 或其他明確 content data files 提供。

程式可以 hard-code **技術常數**，但不可 hard-code **遊戲內容**。

---

## 5. Parallel Work Protocol

GPT 與 Claude 可能在同一時間工作，因此遵守以下規則：

1. **開始工作前先讀最新 `AI_WORKSPACE.md`。**
2. **開始修改 repo 前先拉取 / 讀取最新版本。**
3. 不直接修改另一位 AI primary-owned 的檔案，除非使用者明確要求。
4. 若工作需要跨 ownership，先留下 handoff，而不是猜測另一邊的意圖。
5. 不得把另一邊已完成的內容「順手重寫」。
6. 發現衝突時，以最新已核准的 content specification 為準，不以實作方便度為準。
7. 不使用「暫時 hard-code，之後再改」作為預設方案。

### Anti-Collision Strategy

不要把高頻更新都寫回本檔。

動態工作應使用獨立檔案：

```text
coordination/
  gpt/
    <task-id>.md
  claude/
    <task-id>.md
  handoff/
    <task-id>.md
```

這樣 GPT 與 Claude 可同時 commit，不必反覆修改同一個 status file。

Task ID 建議格式：

```text
GPT-YYYYMMDD-short-name
CLAUDE-YYYYMMDD-short-name
HANDOFF-YYYYMMDD-short-name
```

---

## 6. Handoff Format

跨 GPT / Claude 的需求使用以下格式：

```md
# <TASK-ID>

owner: GPT | Claude
requested_by: GPT | Claude | USER
status: TODO | IN_PROGRESS | BLOCKED | READY | DONE
priority: LOW | MEDIUM | HIGH

## Goal
要完成什麼。

## Inputs
依賴哪些故事、角色、素材、schema 或程式。

## Contract
不可被另一邊任意改變的條件。

## Deliverables
預期產出檔案或功能。

## Validation
完成後如何判定正確。

## Notes
額外資訊。
```

---

## 7. Content Status

GPT 產出的故事 / 角色 / 素材規格可使用：

- `DRAFT`：仍可大改，不應視為穩定 implementation target
- `REVIEW`：等待故事或角色一致性驗證
- `READY`：可交給 Claude 接入
- `LOCKED`：除非使用者要求，不應改變語意
- `DEPRECATED`：不再使用

Claude 應優先實作 `READY` 或 `LOCKED` 內容。

---

## 8. Story Validation Checklist — GPT

GPT 在將故事內容標記為 `READY` 前，至少檢查：

- 角色動機是否前後一致
- 語氣是否符合角色 bible
- 選項是否真的造成有意義的回饋或分支
- 玩家是否知道自己在做什麼選擇
- 情緒轉折是否過快或缺乏原因
- 是否存在前後矛盾
- branch 是否存在 dead end
- ending 是否可由前面的選擇合理推導
- 職場對談內容是否自然，不像教科書選擇題
- 玩家失敗時是否能理解原因
- 同一角色不同立繪 / prompt / scene 的視覺設定是否一致

---

## 9. Implementation Validation Checklist — Claude

Claude 完成實作後至少確認：

- content 並未 hard-code
- `property/` 資料可被替換而不修改 component
- story node IDs 與 references 可驗證
- missing assets 有明確 fallback / error
- invalid branch reference 可被抓出
- save/load 不依賴 display text 作為 key
- character ID 與 display name 分離
- dialogue data 與 presentation layer 分離
- image paths 由 manifest / content data 決定
- 新增角色或章節不需要重寫核心 engine

---

## 10. Asset Contract

每個 generated asset 應至少具有：

```ts
type AssetDefinition = {
  id: string;
  kind: 'character' | 'expression' | 'background' | 'ui' | 'transition' | 'loading';
  file: string;
  owner: 'GPT';
  status: 'DRAFT' | 'REVIEW' | 'READY' | 'LOCKED' | 'DEPRECATED';
  characterId?: string;
  sceneId?: string;
  prompt?: string;
  notes?: string;
};
```

角色圖原則：

- transparent PNG unless otherwise specified
- character IDs 必須固定
- 檔名不可只用角色 display name
- 表情 / pose 使用 stable asset IDs
- GPT 生成新版本時，不覆蓋 LOCKED asset；建立新 asset ID/version

---

## 11. Conflict Resolution

若 GPT 與 Claude 的產出衝突：

1. **故事、角色、對話含義、美術設定** → GPT specification 為準。
2. **程式架構、型別、安全性、build、performance** → Claude technical decision 為準。
3. **資料 schema 同時影響內容與程式** → 不得單方面決定，建立 handoff。
4. **使用者的最新明確指示永遠高於本文件。**

若無法自行解決，保留雙方方案與 trade-off，交由使用者決定，不要偷偷選一邊。

---

## 12. Definition of Done

### GPT deliverable is done when

- content / asset definition 完整
- 一致性已驗證
- IDs 與檔名穩定
- status 為 `READY` 或 `LOCKED`
- Claude 能在不猜測意圖的情況下接入

### Claude deliverable is done when

- 程式可正常 build / run
- 實作符合 content contract
- 沒有把故事內容 hard-code 進程式
- 可以透過替換 `property/` 資料改變遊戲內容
- 完成必要 validation / fallback
- 沒有未申報地修改 GPT-owned semantics

---

## 13. First Instruction for Any AI

當你讀到本檔後：

1. 判斷任務屬於 GPT-owned、Claude-owned 或 Shared。
2. 只修改自己 ownership 範圍內必要的檔案。
3. 若跨界，建立 handoff。
4. 優先保留 data-driven architecture。
5. 完成後清楚列出：新增 / 修改檔案、仍待另一位 AI 處理的事項、任何 contract 變更。

**不要假設另一位 AI 會看到聊天內容。Repo 裡的檔案才是雙方共享的專案記憶。**
