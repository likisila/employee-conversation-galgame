# Agent Instructions

在讀取、修改或審查任何專案檔案前，必須依序完整閱讀並遵守：

1. [docs/AI_ROLE_BOUNDARIES.md](docs/AI_ROLE_BOUNDARIES.md)
2. [docs/AI_HANDOFF.md](docs/AI_HANDOFF.md)
3. [docs/ai-handoff/CLAUDE.md](docs/ai-handoff/CLAUDE.md)
4. [docs/ai-handoff/CHATGPT.md](docs/ai-handoff/CHATGPT.md)

角色邊界與雙向交接都是強制門檻。ChatGPT（包含 Codex）必須在每次 commit／PR 前更新自己的交接紀錄；跨界任務必須拆分，只完成被授權的部分。

## 目前交付方式：GitHub 僅由 Claude 處理（2026-09-30 使用者最新指示）

GitHub 雖已恢復可用，使用者最新明確指示 ChatGPT（包含 Codex）可以唯讀查詢 GitHub，但所有遠端 Git 與會改變 GitHub 狀態的操作全部交由 Claude。詳細規則見 [交接協定](docs/AI_HANDOFF.md#目前交付方式github-僅由-claude-處理)。

## ChatGPT 本地交付

ChatGPT 有檔案變更時：

1. 先在 `docs/ai-handoff/CHATGPT.md` 追加本次 Entry，列出實際變更、驗證結果與交給 Claude 的明確遠端行動。
2. 可以建立本地 commit，也可以透過 GitHub 網站、API 或 CLI 唯讀查看 repository、PR、issue、release 與 Actions 狀態。
3. 不得執行 `fetch`、`pull`、`push` 等遠端 Git，也不得建立、更新、留言、關閉、合併、重新執行或以其他方式改變 PR、issue、release、Actions 或 repository 狀態。
4. 不得因任何舊規則、交接要求或使用者先前的 push 指示而自行恢復遠端變更權限；只有使用者未來再次明確改寫本規則時才可變更。
5. 回覆使用者時說明本地交付狀態與 Claude 待辦，不要求或提供由 ChatGPT 建立的 PR 連結。

純審查、回答問題或其他沒有檔案變更的工作不需追加空交接或建立空 commit。
