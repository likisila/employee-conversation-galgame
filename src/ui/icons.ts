/**
 * 控制元件的線框圖示。規格來自 `property/VISUALS.md`「互動控制元件規格」（ChatGPT 定案）：
 * 20×20、線寬 1.75、圓角端點與轉角、顏色走 `currentColor`，全部由程式產生，不新增圖片素材。
 *
 * 集中在這裡是為了讓同一套圖示語言只有一個出處——回上一句與過場控制列共用同樣的筆畫參數，
 * 不會其中一邊被改成別的粗細或端點樣式。
 */
const SVG_ATTRS = [
  'viewBox="0 0 20 20"',
  'width="20"',
  'height="20"',
  'fill="none"',
  'stroke="currentColor"',
  'stroke-width="1.75"',
  'stroke-linecap="round"',
  'stroke-linejoin="round"',
  'aria-hidden="true"',
  'focusable="false"',
].join(' ');

/** 圖示的路徑。鍵名對應規格裡的名稱。 */
export const ICON_PATHS = {
  /** 單一左箭頭：退回一句（不是連續倒帶，所以只有一支）。 */
  back: '<path d="M16.25 10H4.75"/><path d="M9.75 5 4.75 10l5 5"/>',
  /** Speaker：有聲。 */
  speaker: '<path d="M4 7.5h3L11 4v12L7 12.5H4z"/><path d="M13.75 7.75a3.25 3.25 0 0 1 0 4.5"/>',
  /** Speaker Slash：靜音。 */
  speakerMuted: '<path d="M4 7.5h3L11 4v12L7 12.5H4z"/><path d="m14 8 4 4M18 8l-4 4"/>',
  /** Skip Forward：跳過。 */
  skip: '<path d="M5.5 5.25 12 10l-6.5 4.75z"/><path d="M15 5.25v9.5"/>',
} as const;

export type IconName = keyof typeof ICON_PATHS;

/** 產生一個線框圖示的 inline SVG。 */
export function icon(name: IconName): string {
  return `<svg class="icon" ${SVG_ATTRS}>${ICON_PATHS[name]}</svg>`;
}
