# AI Story Skills

這個資料夾提供給 AI agent 使用的劇情工作流。核心原則：**內容修改優先限制在 `property/`，不要為了寫劇情修改 `src/` 引擎。**

## Skills

- `story-init`：初始化故事目標、角色與初始場景。
- `character-design`：新增或調整角色設定。
- `plot-architect`：設計主線、分支、節奏與結局。
- `dialogue-writer`：撰寫與改寫對話、選項。
- `continuity-check`：檢查角色、場景、分支與狀態一致性。

## 共同規則

1. 先讀 `property/manifest.json`、`property/game.json`、`property/characters.json` 與相關 scenes。
2. 使用穩定 ID，顯示名稱與文字內容不可當作程式邏輯 key。
3. 所有 `next` 必須指向 manifest 內存在的 scene id。
4. 角色名稱、台詞、選項、條件與 effects 必須維持資料驅動。
5. 未被明確要求時，不修改 `src/`、build config 或 engine schema。
6. 變更完成後檢查 JSON 可解析、角色引用存在、scene 跳轉無斷鏈。
