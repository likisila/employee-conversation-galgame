import type { MusicVideoConfig, UiCopy } from '../domain/schema';
import { setKeyHandler } from './keyboard';

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

/**
 * 通關後自選觀看的完整 MV（docs/media/cutscene-mv-integration-20261117.md v2）。
 *
 * 與主線過場刻意分開：
 * - 只有玩家在結局畫面自己按下才播放，整首不自動播放，也不寫進存檔或「已看過」紀錄。
 * - 蓋在結局畫面上（不取代它），關閉後回到原本那個結局，可再開、可重播。
 * - 聲音：這是歌曲，玩家主動點開，因此預設有聲；音量、靜音、進度與全螢幕交給瀏覽器原生控制列，
 *   不沿用過場的靜音偏好（那是為了「沒按就自己播」的主線過場設計的）。
 * - MV 含其他分支畫面時，先顯示劇透提示，確認後才開始載入。
 *
 * `onClose` 在關閉時呼叫一次，由呼叫端重畫結局畫面並把焦點還給入口按鈕。
 */
export function openMusicVideo(app: HTMLElement, config: MusicVideoConfig, ui: UiCopy, onClose: () => void): void {
  const src = config.src;
  if (!src) return;

  const overlay = document.createElement('section');
  overlay.className = 'decision-menu music-video';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', ui.musicVideoLabel);
  app.appendChild(overlay);

  let video: HTMLVideoElement | undefined;
  let closed = false;

  const close = (): void => {
    if (closed) return;
    closed = true;
    // 先停掉播放再拆掉畫面，避免歌曲在背景繼續出聲。
    if (video) {
      video.pause();
      video.removeAttribute('src');
      video.load();
    }
    overlay.remove();
    setKeyHandler(undefined);
    onClose();
  };

  const focusable = (): HTMLElement[] => [...overlay.querySelectorAll<HTMLElement>('button, video[controls]')];

  overlay.addEventListener('click', (event) => {
    // 只有劇透提示階段點遮罩等於「先不要」；播放中點到影片周圍的黑邊不該把影片關掉。
    if (event.target === overlay && !video) close();
  });

  setKeyHandler((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      // 瀏覽器全螢幕時 Esc 是離開全螢幕，不連帶關掉 MV。
      if (document.fullscreenElement) return;
      event.preventDefault();
      close();
      return;
    }
    if (event.key === 'Tab') {
      // 焦點留在 MV 視窗內，不讓 Tab 跑到底下被蓋住的結局畫面。
      const items = focusable();
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !overlay.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
      return;
    }
    // 結局畫面的 Enter／空白鍵／左方向鍵在 MV 開著時不生效；按鈕與影片控制列自己的按鍵照常。
    const target = event.target as HTMLElement | null;
    if (target?.closest('button, video')) return;
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowLeft') event.preventDefault();
  });

  const showUnavailable = (): void => {
    if (closed) return;
    if (video) {
      video.pause();
      video.removeAttribute('src');
      video.load();
      video = undefined;
    }
    overlay.innerHTML = `
      <div class="decision-panel music-video-panel" role="alert">
        <p>${escapeHtml(ui.musicVideoUnavailableLabel)}</p>
        <button type="button" class="secondary-action decision-close" id="music-video-close">${escapeHtml(ui.musicVideoCloseLabel)}</button>
      </div>
    `;
    overlay.querySelector<HTMLButtonElement>('#music-video-close')?.addEventListener('click', close);
    overlay.querySelector<HTMLButtonElement>('#music-video-close')?.focus();
  };

  const play = (): void => {
    overlay.innerHTML = `
      <div class="music-video-stage">
        <button type="button" class="cutscene-button music-video-close" id="music-video-close">${escapeHtml(ui.musicVideoCloseLabel)}</button>
      </div>
    `;
    const stage = overlay.querySelector<HTMLElement>('.music-video-stage');
    if (!stage) return;
    const element = document.createElement('video');
    element.className = 'music-video-player';
    element.controls = true;
    element.playsInline = true;
    element.preload = 'auto';
    element.setAttribute('aria-label', ui.musicVideoLabel);
    element.addEventListener('error', showUnavailable, { once: true });
    stage.prepend(element);
    video = element;
    overlay.querySelector<HTMLButtonElement>('#music-video-close')?.addEventListener('click', close);

    element.src = src;
    // 這一步仍在玩家點擊的處理流程裡，瀏覽器允許有聲自動播放；
    // 仍被擋下時停在第一格，玩家按原生控制列的播放鍵即可，不強制靜音。
    void element.play().catch(() => undefined);
    element.focus();
  };

  if (!config.spoilerNotice) {
    play();
    return;
  }

  overlay.innerHTML = `
    <div class="decision-panel music-video-panel">
      <h2>${escapeHtml(ui.musicVideoLabel)}</h2>
      <p>${escapeHtml(ui.musicVideoSpoilerNotice)}</p>
      <button type="button" class="primary-action full" id="music-video-confirm">${escapeHtml(ui.musicVideoConfirmLabel)}</button>
      <button type="button" class="secondary-action decision-close" id="music-video-cancel">${escapeHtml(ui.musicVideoCancelLabel)}</button>
    </div>
  `;
  overlay.querySelector<HTMLButtonElement>('#music-video-confirm')?.addEventListener('click', play);
  overlay.querySelector<HTMLButtonElement>('#music-video-cancel')?.addEventListener('click', close);
  overlay.querySelector<HTMLButtonElement>('#music-video-confirm')?.focus();
}
