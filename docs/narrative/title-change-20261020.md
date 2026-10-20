# 《最後一次簽名》正式標題與整合交接

狀態：標題文案 LOCKED；內容更新已納入本次 PR，程式整合待 Claude。

使用者於 2026-10-20 更正並定案：

- 中文：最後一次簽名
- 英文：THE FINAL SIGNATURE

中文逐字使用「最後一次簽名」，不是「最後一個簽名」。英文標題以全大寫顯示。

## 本次已更新

- property/game.json：title 改為「最後一次簽名」。
- property/ui.json：startLabel 改為「開始遊戲」。
- README.md、story.md、story-bible.md、property/README.md、docs/narrative/last-one-on-one/story.md、docs/narrative/last-one-on-one/START-HERE.txt：同步作品顯示名稱；有中英文並列時英文改為 THE FINAL SIGNATURE。
- docs/ai-handoff/CHATGPT.md：記錄本次定案、驗證及使用者明確授權直接提交 GitHub PR。

## Claude 程式整合

1. 標題畫面：中文主標「最後一次簽名」，其下以較小字另行顯示「THE FINAL SIGNATURE」。保留既有故事介紹。新增英文欄位、schema 或 renderer 的實作由 Claude 負責。
2. 瀏覽器分頁：index.html 的 title 改為「最後一次簽名 | THE FINAL SIGNATURE」。
3. 案例紀錄：src/domain/mba.ts 的摘要第一行改用「《最後一次簽名》案例紀錄｜{結局名稱}｜{結局標籤}」。
4. 掃描其他現行玩家可見的作品名稱引用並同步；歷史交接、歷史製作版、章節／劇情中實際描述一對一會談的文字保留原文。
5. 維持 game id「last-one-on-one」、既有目錄、場景 ID、存檔鍵、路由、分支條件與素材路徑，避免改名破壞存檔或資產引用。
6. 本次 PR 僅為內容與交接，不宣稱已完成雙語畫面、分頁、摘要的程式整合或部署。Claude 更新自己的交接紀錄並回覆本次 Entry 後，再依專案流程完成整合與交付。

## 驗收

- 中文、英文、開始按鈕在桌機及手機完整可見，保留故事介紹。
- 分頁與案例摘要顯示新作品名。
- 舊存檔可繼續，故事選擇與四個結局行為不變。
- Claude 程式整合後執行 typecheck、相關測試、build 與實機檢查。
