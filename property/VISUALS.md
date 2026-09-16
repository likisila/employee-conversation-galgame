# Visual property model

視覺資產採資料驅動。場景與 TypeScript 不直接依賴圖片檔名。

## `images.json`

- `characters`：角色 sprite sheet、表情 frame。
- `backgrounds`：背景圖片與 focal point。
- `screens`：title / loading 等全螢幕畫面。
- `ui`：對話框、選項框、wipe 等 UI 素材。
- `transitions`：轉場時間與可選 UI asset。
- `scenePresentation`：每個 scene 的背景、主要角色、表情與轉場。

例如：

```json
{
  "intro": {
    "background": "meeting-room",
    "character": "employee",
    "expression": "uneasy",
    "transition": "fade"
  }
}
```

修改角色表情或背景時，只修改 `property/images.json`。不要在 `src/ui/render.ts` 寫 scene id 特例。

## Asset folders

```text
public/assets/
├── characters/
├── backgrounds/
├── screens/
└── ui/
```

檔案路徑可以替換，只要同步更新 `images.json` 即可。
