---
name: continuity-check
description: Audit the property-driven story for broken references, inconsistent characters, unreachable scenes, state logic errors, and narrative continuity issues.
---

# Continuity Check

用於劇情完成後或大型修改後的整體檢查。

## Structural checks

1. `game.startScene` 必須存在於 manifest scenes。
2. manifest 列出的每個 scene file 都能解析，且 scene id 唯一。
3. 所有 `choices[].next` 與 scene-level `next` 都指向存在的 scene。
4. 所有非 null `speaker` 都存在於 `characters.json`。
5. Choice id 在同一 scene 內不可重複。
6. Conditions 與 effects 使用的 variable 要有一致型別與語意。
7. 找出 orphan、unreachable、dead-end scene，並區分刻意結局與錯誤斷鏈。

## Narrative checks

- 角色不能知道尚未發生或未被告知的資訊。
- 稱謂、職位、關係、語氣與事件時間線要一致。
- 玩家先前選擇造成的信任、清晰度等變化，後續反應需合理。
- 同一事件不能在不同 route 中出現互相衝突的事實，除非 route 本來就是不同世界狀態。
- 結局需能追溯到前面的 choices，而不是無因跳轉。

## Output behavior

優先直接修正明確的資料錯誤。對有多種合理解法的劇情問題，標記問題、受影響 scene 與可選修正方向，不擅自大改角色人格。

## Constraints

檢查與修正預設限於 `property/`。若真正問題來自 engine/schema，清楚指出，不以故事資料 hack 繞過引擎規則。
