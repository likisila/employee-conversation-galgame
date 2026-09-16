# property 資料夾

這裡是遊戲內容層。一般劇本修改不需要碰 `src/`。

- `manifest.json`：列出遊戲、角色、UI 與所有場景資料檔。
- `game.json`：遊戲標題、起始場景與初始變數。
- `characters.json`：角色 ID、顯示名稱、職稱等。
- `ui.json`：按鈕與 UI 文案。
- `scenes/*.json`：對話、選項、條件、效果與跳轉。

## 修改角色名字
只改 `characters.json` 的 `displayName`。場景只使用穩定 `id`，不用逐場景搜尋替換。

## 修改對話
直接改 `scenes/*.json` 裡的 `lines[].text`。

## 新增場景
1. 新增 `scenes/your-scene.json`。
2. 把檔名加入 `manifest.json` 的 `scenes`。
3. 讓某個選項的 `next` 指向新場景的 `id`。

## 分支變數
`game.json` 的 `initialState` 可新增任意字串、數值或布林值。選項透過 `effects` 修改狀態，透過 `conditions` 決定是否顯示。
