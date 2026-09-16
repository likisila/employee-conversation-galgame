---
name: dialogue-writer
description: Write or rewrite character dialogue and player choices in editable scene JSON while preserving IDs, branches, and game logic.
---

# Dialogue Writer

用於新增、改寫、縮短或調整 Gal Game 的對話與玩家選項。

## Workflow

1. 讀取角色設定與該 scene 前後文。
2. 保留 scene id、choice id、`next`、conditions、effects，除非任務明確要求改分支。
3. 把 NPC 台詞寫在 `lines[].text`，speaker 使用角色 id。
4. 玩家選項文字寫在 `choices[].text`，避免把判斷邏輯藏進文字。
5. 每個選項應讓玩家能理解意圖差異，但不要直接揭露數值機制，例如不要寫「信任 +1」。
6. 對話要能反映角色身份、情緒與既有事件，不重複講已知資訊。

## Style

- 優先自然口語，而非教材式說教。
- 一次只推進一個主要資訊或情緒節點。
- 選項要代表真正不同的管理/溝通行為，例如探詢、假設、給建議、設界線。
- 讓錯誤選項有合理吸引力，而不是明顯的壞答案。

## Constraints

內容文字永遠留在 `property/`。不要把任何台詞、角色顯示名稱或 choice label hard-code 到 TypeScript renderer。
