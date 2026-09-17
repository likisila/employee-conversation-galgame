let keyHandler: ((event: KeyboardEvent) => void) | undefined;

/**
 * 同一時間只保留一個鍵盤處理器（讀取畫面、過場影片、轉場卡、對話各自換上自己的）。
 * 傳 undefined 代表這個畫面不接鍵盤。
 */
export function setKeyHandler(handler: ((event: KeyboardEvent) => void) | undefined): void {
  if (keyHandler) document.removeEventListener('keydown', keyHandler);
  keyHandler = handler;
  if (handler) document.addEventListener('keydown', handler);
}
