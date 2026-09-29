# AI 更新交接協定

ChatGPT（包含 Codex）與 Claude 必須透過本目錄的雙向交接紀錄交流。此協定適用於每一次檔案更新、commit 與 PR；只有口頭摘要而沒有寫入交接紀錄，不算完成交流。

## 固定檔案

- ChatGPT 只追加 `docs/ai-handoff/CHATGPT.md`。
- Claude 只追加 `docs/ai-handoff/CLAUDE.md`。
- 兩方都必須讀取兩份紀錄，但不得修改對方的紀錄。

分開寫入可避免兩方同時工作時發生同一檔案的 merge conflict。

## 開始更新前

1. 完整閱讀 `docs/AI_ROLE_BOUNDARIES.md`。
2. 閱讀本協定及兩份交接紀錄。
3. 找出對方最新的 Entry ID、未完成請求與阻塞項目。
4. 在本次自己的交接紀錄中回覆已讀的對方 Entry ID；若對方沒有新紀錄，寫「無新紀錄」。

未完成以上步驟，不得修改其他專案檔案。

## commit／PR 前

代理必須先在自己的紀錄末尾追加一筆，包含：

- Entry ID：`角色-YYYYMMDD-HHMM`；同分鐘重複時加序號。
- 時間：ISO 8601 UTC。
- 分支或 PR。
- 已讀對方紀錄：對方最新 Entry ID 或「無新紀錄」。
- 本次範圍與實際變更檔案。
- 已定案事項。
- 交給對方的明確行動。
- 未決問題或阻塞。
- 驗證結果。

沒有交接紀錄的更新不得視為完成，也不得合併。

## 目前交付方式：GitHub 僅由 Claude 處理

使用者於 2026-09-30 最新指示：GitHub 已恢復可用，ChatGPT（包含 Codex）可以唯讀查詢 GitHub，但不得執行遠端 Git 或任何會改變 GitHub 狀態的操作；遠端變更全部交由 Claude。這項指示取代同日稍早要求 ChatGPT 也推送、開 PR 與合併的規則。

- ChatGPT：可透過 GitHub 網站、API 或 CLI 進行唯讀查詢；可查看 repository、PR、issue、release 與 Actions 狀態。不得執行 `fetch`、`pull`、`push` 等遠端 Git，也不得建立、更新、留言、關閉、合併、重新執行或以其他方式改變 PR／issue／release／Actions／repository 狀態。
- Claude：負責所有 GitHub 與遠端 Git 交付，包括整理雙方本地成果、推送、建立或更新 PR、遠端驗證及合併。
- ChatGPT 有檔案變更時，必須在 `docs/ai-handoff/CHATGPT.md` 留下完整 Entry 與交給 Claude 的明確遠端行動；缺少 PR 連結不再使 ChatGPT 的本地交付失效。

## Claude 開 PR（遠端交接的送達方式）

Claude 整理出要交付的檔案變更後，必須：

1. 先讀取 ChatGPT 最新 Entry，追加自己的交接紀錄並 commit 必要的整合變更。
2. `git push -u origin <branch>` 把分支推上遠端。
3. 該分支尚未有 PR 就建立一個；已經有 PR 就更新同一個 PR，不要為同一批工作另開新 PR。
4. PR 內文至少包含：本次 Entry ID、實際變更檔案、交給對方的明確行動、驗證結果。
5. 回覆使用者時附上該 PR 的連結。

純審查、回答問題或沒有檔案變更的工作不必開 PR，也不要開空 PR。

上述 PR 要求只約束 Claude 的遠端交付。ChatGPT 不得為了補 PR 連結而碰觸 GitHub；ChatGPT 的本地交付以自己的 Entry、本地驗證與交給 Claude 的明確行動為準。Claude 完成遠端交付後，應在自己的紀錄中引用 ChatGPT Entry 與 PR。

## 雙向確認

- 收到交接事項的一方，必須在自己的下一筆紀錄中引用對方 Entry ID 並逐項回覆：接受、完成、阻塞或需澄清。
- 跨角色依賴在接收方留下回覆前維持「待確認」，不得宣稱整體工作已完成。
- 若內容與角色邊界衝突，接收方必須拒絕越界部分，並在紀錄中指出正確負責角色。
