# Agent Instructions

在讀取、修改或審查任何專案檔案前，必須依序完整閱讀並遵守：

1. [docs/AI_ROLE_BOUNDARIES.md](docs/AI_ROLE_BOUNDARIES.md)
2. [docs/AI_HANDOFF.md](docs/AI_HANDOFF.md)
3. [docs/ai-handoff/CLAUDE.md](docs/ai-handoff/CLAUDE.md)
4. [docs/ai-handoff/CHATGPT.md](docs/ai-handoff/CHATGPT.md)

角色邊界與雙向交接都是強制門檻。ChatGPT（包含 Codex）必須在每次 commit／PR 前更新自己的交接紀錄；跨界任務必須拆分，只完成被授權的部分。

## 完成後必須開 PR

工作完成後，一定要把分支推上遠端並開 Pull Request。只留在本地、或推了分支卻沒有開 PR，對方代理看不到這次的變更，等同沒有交接：

1. 先在 `docs/ai-handoff/CHATGPT.md` 追加本次 Entry，再 commit。
2. `git push -u origin <branch>`。
3. 立刻開 PR，標題寫本次範圍，內文至少包含：本次 Entry ID、實際變更檔案、交給對方的明確行動、驗證結果。
4. PR 開好後，在回覆使用者時附上 PR 連結。

沒有 PR 連結的工作一律視為未完成。
