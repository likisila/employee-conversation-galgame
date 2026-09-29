# Agent Instructions

在讀取、修改或審查任何專案檔案前，必須依序完整閱讀並遵守：

1. [docs/AI_ROLE_BOUNDARIES.md](docs/AI_ROLE_BOUNDARIES.md)
2. [docs/AI_HANDOFF.md](docs/AI_HANDOFF.md)
3. [docs/ai-handoff/CLAUDE.md](docs/ai-handoff/CLAUDE.md)
4. [docs/ai-handoff/CHATGPT.md](docs/ai-handoff/CHATGPT.md)

角色邊界與雙向交接都是強制門檻。ChatGPT（包含 Codex）必須在每次 commit／PR 前更新自己的交接紀錄；跨界任務必須拆分，只完成被授權的部分。

## 目前交付方式：已恢復遠端（2026-09-30 使用者指示）

2026-09-20 起暫停推送 GitHub 與建立／更新遠端 PR；使用者已於 2026-09-30 明確通知「Github is working now, push PR and merge」，恢復遠端交付。下方「完成後必須開 PR」規則即日起適用。詳細規則見 [交接協定](docs/AI_HANDOFF.md#目前交付方式僅本地)。

## 完成後必須開 PR

有檔案變更時，一定要把分支推上遠端並讓變更出現在 PR 上。只留在本地、或推了分支卻沒有 PR，對方代理看不到這次的變更，等同沒有交接：

1. 先在 `docs/ai-handoff/CHATGPT.md` 追加本次 Entry，再 commit。
2. `git push -u origin <branch>`。
3. 該分支**尚未有 PR** 就立刻建立；**已經有 PR** 就不要另開一個，push 上去即算更新，並在必要時補充 PR 內文。
4. PR 內文至少包含：本次 Entry ID、實際變更檔案、交給對方的明確行動、驗證結果。
5. 回覆使用者時附上該 PR 的連結（更新既有 PR 時附原本那個連結）。

純審查、回答問題或其他沒有檔案變更的工作不必開 PR，也不要開空 PR；回覆寫在對話或既有 PR 的留言即可。

有檔案變更卻沒有對應 PR 連結的工作，一律視為未完成。
