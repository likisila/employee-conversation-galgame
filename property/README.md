# property 資料夾

這裡是遊戲內容層。一般劇本修改不需要碰 `src/`。

- `manifest.json`：列出遊戲、角色、UI 與所有場景資料檔。
- `game.json`：遊戲標題、起始場景與初始變數。
- `characters.json`：角色 ID、顯示名稱、職稱等。
- `ui.json`：按鈕與 UI 文案。
- `images.json`：立繪、背景、轉場與每個場景的視覺設定。
- `scenes/*.json`：對話、選項、條件、效果與跳轉。
- `cutscenes.json` / `sora-cutscenes.json`：過場影片的算圖／生成設定；runtime 不載入，僅供 `scripts/` 使用。

## 目前作品：《最後一次一對一》

- 狀態變數：`trust`（坦誠）、`procedure`（程序）、`boundary`（界線）、`avoidance`（逃避）。四者預設隱藏，不以好感度呈現。
- 每個主要選擇會額外 `set` 一個 `choice1`…`choice5` 字串，供後續場景的條件台詞使用。
- 場景流程：`s1-final-cut → s2-invite → s3-meeting → s4-notice → s5-when-did-you-know → s6-receipt → s7-not-in-file → s8-reaction → s9-doorway →（四個結局之一）`。
- `s9-doorway` 是純路由節點，依序判定：**越線**（`boundary <= -2`）→ **TRUE END**（`trust >= 6`、`procedure >= 4`、`boundary >= 2`、`avoidance <= 1`）→ **體面的句點**（`procedure >= 4`、`trust >= 2`、`boundary >= 0`）→ **柔軟的刀**（其餘）。

## 修改角色名字
只改 `characters.json` 的 `displayName`。場景只使用穩定 `id`，不用逐場景搜尋替換。

## 修改對話
直接改 `scenes/*.json` 裡的 `lines[].text`。

## 條件台詞（依先前選擇分歧）
`lines[]` 的每一句都可以帶 `conditions`；全部成立才顯示，沒有 `conditions` 則永遠顯示。

```json
{ "speaker": "lin-yucheng", "text": "我把檔案存好了。", "conditions": [{ "variable": "choice1", "operator": "eq", "value": "clear" }] }
```

支援的 operator：`eq`、`neq`、`gt`、`gte`、`lt`、`lte`。

## 路由場景（有優先序的自動跳轉）
場景可以帶 `route`，引擎會**由上到下**取第一個條件全部成立的項目自動前往，玩家不會停在路由場景上。最後一項不寫 `conditions` 即為預設路徑。

```json
{
  "id": "s9-doorway",
  "lines": [],
  "choices": [],
  "route": [
    { "conditions": [{ "variable": "boundary", "operator": "lte", "value": -2 }], "next": "ending-over-line" },
    { "next": "ending-soft-knife" }
  ]
}
```

## 新增場景
1. 新增 `scenes/your-scene.json`。
2. 把檔名加入 `manifest.json` 的 `scenes`。
3. 讓某個選項的 `next`、場景的 `next` 或 `route` 指向新場景的 `id`。
4. 如需視覺設定，在 `images.json` 的 `sceneBackgrounds` / `scenePresentation` 加上同名項目。

## 分支變數
`game.json` 的 `initialState` 可新增任意字串、數值或布林值。選項透過 `effects` 修改狀態（`add` 僅限數值、`set` 可為任何型別），透過 `conditions` 決定是否顯示。
