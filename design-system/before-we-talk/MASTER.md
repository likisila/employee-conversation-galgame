# 《開口之前》Design System

## Direction

成熟、克制、有人味的職場視覺小說。以現代瑞士式資訊階層承載電影感場景，不使用校園 Gal Game 的糖果色、可愛圖示或過度裝飾。

## Tokens

| Token | Value | Use |
|---|---:|---|
| Ink | `#0C1A24` | 主背景、對話框 |
| Ink soft | `#152936` | 次表面 |
| Paper | `#F8FAFC` | 主要文字 |
| Muted | `#C9D3D9` | 次要文字 |
| Teal | `#78AEB7` | 主管／互動狀態 |
| Amber | `#E8B75F` | 焦點、CTA、員工 |
| Burgundy | `#9E6068` | HR、嚴肅提示 |
| Focus | `#FFD68A` | 鍵盤焦點 |

標題使用 Noto Serif TC，介面與內文使用 Noto Sans TC。間距遵循 8px 節奏；一般文字至少 16px，對比至少 4.5:1。

## Layout

- 桌面：角色置中，對話框最大寬 1152px，選項在對話框上方靠右。
- 手機：角色縮短至 64vh，對話框保留底部安全區，選項可垂直捲動。
- 橫向矮螢幕：壓縮角色與對話框高度，隱藏非必要 meta。
- 所有固定工具按鈕至少 48px；鍵盤焦點保持可見且不被對話框遮住。

## Motion

場景與角色以 420ms 內的 opacity/transform 過場；控制回饋 160ms。`prefers-reduced-motion` 時移除非必要動畫，直接顯示終態。

## Image Rules

- 背景為 16:9 WebP，保留安靜下三分之一給對話 UI。
- 角色 PNG 必須保留 alpha；每張 4 欄，順序由 `images.ts` 的 expression map 決定。
- 所有有意義圖像提供中文替代文字；裝飾性 SVG 不進入可及性樹。
