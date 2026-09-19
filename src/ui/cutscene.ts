import type { CutsceneCue, UiCopy } from '../domain/schema';
import { icon } from './icons';
import { setKeyHandler } from './keyboard';

/**
 * 影片超過這麼久還載不到第一幀就放棄，直接進場景。
 * 對應 `property/cutscenes.json` 的 `skip-video-and-enter-canonical-scene`：
 * 缺檔或網路慢都不該把玩家卡在黑畫面。
 */
const LOAD_TIMEOUT_MS = 6000;

/** 影片出現後這麼久內的點擊視為前一個畫面的連點，不算跳過。 */
const MIN_DWELL_MS = 400;

/**
 * 玩家的靜音偏好；記在瀏覽器，換一段影片仍然沿用。
 * 影片預設靜音，只有玩家自己按過「開聲音」才會記成 `false`。
 * 換了新的 key：舊版每次播放都會把當下狀態（多半是有聲）寫進去，沿用舊 key 會讓老玩家永遠有聲。
 */
export const MUTE_KEY = 'ecg:cutscene-muted-v2';

export function readMuted(storage: Pick<Storage, 'getItem'> | undefined = globalThis.window?.localStorage): boolean {
  try {
    return storage?.getItem(MUTE_KEY) !== 'false';
  } catch {
    // 隱私模式或配額用盡：當作沒有偏好，照預設靜音。
    return true;
  }
}

function writeMuted(muted: boolean): void {
  try {
    window.localStorage.setItem(MUTE_KEY, String(muted));
  } catch {
    // 存不了就算了，只是下次不記得而已。
  }
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

/**
 * 播放一段過場影片，播完、玩家跳過、缺檔或載入逾時都會呼叫 `onFinish` 一次。
 *
 * 缺檔策略照 `property/cutscenes.json`：不回退到任何替代影片，直接進入正式場景。
 * 影片只有環境音、沒有對白，因此不需要字幕軌；仍以 aria-label 讓螢幕閱讀器知道這裡在播什麼。
 */
export function playCutscene(app: HTMLElement, cue: CutsceneCue, ui: UiCopy, onFinish: () => void): void {
  const video = document.createElement('video');
  video.className = 'cutscene-video';
  video.playsInline = true;
  video.preload = 'auto';
  video.setAttribute('aria-label', ui.cutsceneLabel);
  video.muted = readMuted();

  let done = false;
  let shown = false;
  let shownAt = 0;
  let timer: number | undefined = window.setTimeout(() => finish(), LOAD_TIMEOUT_MS);

  /**
   * 探測期間先蓋一層透明的攔截層：畫面維持在前一幕（缺檔時完全沒有黑閃），
   * 但點擊與鍵盤都不會再推進劇情——否則玩家可以在待播的影片底下把劇情往前推。
   */
  const shield = document.createElement('div');
  shield.className = 'cutscene-shield';
  app.appendChild(shield);
  setKeyHandler((event: KeyboardEvent) => {
    // 只擋會推進劇情的那幾顆鍵，Tab、F5 等照常。
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowLeft') event.preventDefault();
  });

  function finish(): void {
    if (done) return;
    done = true;
    if (timer !== undefined) window.clearTimeout(timer);
    setKeyHandler(undefined);
    shield.remove();
    // 先停掉播放再交棒，避免影片在背景繼續出聲。
    video.pause();
    video.removeAttribute('src');
    video.load();
    onFinish();
  }

  // 缺檔（404）與解碼失敗都走同一條路：不播、不蓋畫面，直接進場景。
  video.addEventListener('error', finish);
  video.addEventListener('ended', finish);

  /**
   * 確定影片載得到才蓋上畫面。9 段影片目前多數尚未生成，若先鋪黑底再去載，
   * 玩家會在每個缺檔的場景看到一次黑閃；先驗證再顯示就完全沒有這個過渡。
   */
  video.addEventListener('loadedmetadata', () => {
    if (done || shown) return;
    if (timer !== undefined) window.clearTimeout(timer);
    timer = undefined;
    shown = true;
    shownAt = performance.now();
    show();
  });

  function show(): void {
    app.innerHTML = `
      <section class="cutscene" data-cutscene="${escapeHtml(cue.id)}">
        <div class="cutscene-controls">
          <button type="button" class="cutscene-button" id="cutscene-mute" aria-label="${escapeHtml(ui.muteCutsceneLabel)}" aria-pressed="false">${icon('speaker')}</button>
          <button type="button" class="cutscene-button" id="cutscene-skip">${escapeHtml(ui.skipCutsceneLabel)}${icon('skip')}</button>
        </div>
      </section>
    `;
    const section = app.querySelector<HTMLElement>('.cutscene');
    const muteButton = app.querySelector<HTMLButtonElement>('#cutscene-mute');
    if (!section) {
      finish();
      return;
    }
    section.prepend(video);

    // 只有玩家按靜音鍵時才記下偏好；播放時的預設與下面的自動退回都不算玩家的選擇。
    const applyMuted = (muted: boolean, remember = false): void => {
      video.muted = muted;
      if (remember) writeMuted(muted);
      if (!muteButton) return;
      muteButton.setAttribute('aria-pressed', String(muted));
      // 圖示跟著狀態換成 Speaker／Speaker Slash；不使用 emoji 或字型符號。
      muteButton.innerHTML = icon(muted ? 'speakerMuted' : 'speaker');
    };
    applyMuted(video.muted);

    // 預設靜音一定能自動播；玩家開了聲音而被瀏覽器擋下時，
    // 退一步改成靜音再試，再失敗就跳過影片，不讓玩家卡住。
    void video.play().catch(() => {
      if (done) return;
      applyMuted(true);
      void video.play().catch(finish);
    });

    // 影片剛出現那一下的點擊當成前一個畫面的連點，不算跳過。
    const skippable = (): boolean => performance.now() - shownAt >= MIN_DWELL_MS;
    section.addEventListener('click', (event) => {
      if ((event.target as HTMLElement).closest('button')) return;
      if (skippable()) finish();
    });
    // 控制列上的點擊永遠不算「點畫面跳過」。這一行不是多餘的保險：靜音鍵在自己的 handler 裡
    // 會換掉圖示（重建按鈕內容），事件冒泡到上面那個 handler 時，原本的點擊目標已經被拔離
    // 按鈕，`closest('button')` 會找不到祖先而誤判成點背景，影片就被跳掉了。
    app.querySelector<HTMLElement>('.cutscene-controls')?.addEventListener('click', (event) => event.stopPropagation());
    app.querySelector<HTMLButtonElement>('#cutscene-skip')?.addEventListener('click', finish);
    muteButton?.addEventListener('click', () => applyMuted(!video.muted, true));

    setKeyHandler((event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        finish();
        return;
      }
      if (event.key !== 'Enter' && event.key !== ' ') return;
      if ((event.target as HTMLElement | null)?.closest('button')) return;
      event.preventDefault();
      if (skippable()) finish();
    });
  }

  video.src = cue.src;
  video.load();
}
