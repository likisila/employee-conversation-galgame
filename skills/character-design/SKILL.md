---
name: character-design
description: Create and maintain consistent Gal Game characters while keeping names and presentation data editable in property files.
---

# Character Design

用於新增角色、修改角色名稱、身份、說話風格與互動定位。

## Source of truth

角色基本資料放在 `property/characters.json`。Scene 只能用角色 `id` 引用角色，不複製 `displayName` 當識別值。

## Workflow

1. 先檢查既有角色 ID，避免建立語意重複的新角色。
2. 為新角色建立簡短、穩定、無空白的 `id`。
3. 把可編輯名稱放在 `displayName`，職務或身份放在 `role`。
4. 若需要立繪或 avatar，只保存可替換的資源 path/reference，不把 URL 或檔名散落在 scenes。
5. 檢查該角色已出現的 scenes，確保語氣、知識範圍、關係與事件記憶一致。
6. 修改顯示名稱時，不修改 scene 中的 speaker id。

## Writing guidance

- 每個主要角色要有清楚的動機、壓力來源與說話節奏。
- 避免所有角色使用相同語氣。
- 員工訓練情境中，角色反應應由玩家選擇與 state 影響，而不是突然跳轉。

## Constraints

預設只修改 `property/characters.json` 與必要的 `property/scenes/*.json`。不要因角色改名修改 TypeScript。
