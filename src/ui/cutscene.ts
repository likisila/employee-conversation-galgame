import type { CutsceneCue, StoryboardFrame, UiCopy } from '../domain/schema';
import { icon } from './icons';
import { setKeyHandler } from './keyboard';

/**
 * 影片（或分鏡的第一格）超過這麼久還載不到就放棄，直接進場景。
 * 對應 `property/cutscenes.json` 的 `skip-video-and-enter-canonical-scene`：
 * 缺檔或網路慢都不該把玩家卡在黑畫面。
 */
const LOAD_TIMEOUT_MS = 6000;

/** 影片出現後這麼久內的點擊視為前一個畫面的連點，不算跳過。 */
const MIN_DWELL_MS = 400;

/** 分鏡輪播的交叉淡化時間；要與 visual.css 的 `.cutscene-frame` transition 一致。 */
export const STORYBOARD_FADE_MS = 500;

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
 * 播放一段過場，播完、玩家跳過、缺檔或載入逾時都會呼叫 `onFinish` 一次。
 *
 * 先試正式 MP4；影片缺檔或無法解碼、而這段 cue 有分鏡影格時，改為輪播分鏡當 placeholder。
 * 兩者都沒有就照 `property/cutscenes.json` 直接進入正式場景。正式 MP4 一放進來就自動優先，
 * 不需要改任何資料。
 * 影片與分鏡都沒有對白，因此不需要字幕軌；仍以 aria-label 讓螢幕閱讀器知道這裡在播什麼。
 */
export function playCutscene(app: HTMLElement, cue: CutsceneCue, ui: UiCopy, onFinish: () => void): void {
  const video = document.createElement('video');
  video.className = 'cutscene-video';
  video.playsInline = true;
  video.preload = 'auto';
  video.setAttribute('aria-label', ui.cutsceneLabel);
  video.muted = readMuted();

  /** `video`：正在探測或播放影片；`storyboard`：影片不可用，改輪播分鏡。 */
  let mode: 'video' | 'storyboard' = 'video';
  let done = false;
  let shown = false;
  let shownAt = 0;
  let timer: number | undefined = window.setTimeout(() => finish(), LOAD_TIMEOUT_MS);
  let frameTimer: number | undefined;

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

  function stopVideo(): void {
    video.pause();
    video.removeAttribute('src');
    video.load();
  }

  function finish(): void {
    if (done) return;
    done = true;
    if (timer !== undefined) window.clearTimeout(timer);
    if (frameTimer !== undefined) window.clearTimeout(frameTimer);
    setKeyHandler(undefined);
    shield.remove();
    // 先停掉播放再交棒，避免影片在背景繼續出聲。
    stopVideo();
    onFinish();
  }

  /** 素材確定載得到了：停掉逾時計時，從這一刻開始算防連點的停留時間。 */
  function reveal(): void {
    if (timer !== undefined) window.clearTimeout(timer);
    timer = undefined;
    shown = true;
    shownAt = performance.now();
  }

  video.addEventListener('error', () => {
    // 換成分鏡時清掉 src 也會觸發 error，這裡只處理影片本身的失敗。
    if (done || mode !== 'video') return;
    // 已經開播才中途解碼失敗：不要半途換成分鏡，直接進場景。
    if (shown || !cue.storyboard) {
      finish();
      return;
    }
    playStoryboard(cue.storyboard);
  });
  video.addEventListener('ended', finish);

  /**
   * 確定影片載得到才蓋上畫面。多數正式影片尚未生成，若先鋪黑底再去載，
   * 玩家會在每個缺檔的場景看到一次黑閃；先驗證再顯示就完全沒有這個過渡。
   */
  video.addEventListener('loadedmetadata', () => {
    if (done || shown || mode !== 'video') return;
    reveal();
    showVideo();
  });

  /**
   * 蓋上過場畫面與控制列，接好「點畫面／Enter／Space 跳過、Esc 立即跳過」。
   * 影片與分鏡共用同一套操作；只有影片有聲音，所以只有影片有靜音鍵。
   */
  function mountStage(media: HTMLElement, withMute: boolean): HTMLElement | undefined {
    const muteButtonHtml = withMute
      ? `<button type="button" class="cutscene-button" id="cutscene-mute" aria-label="${escapeHtml(ui.muteCutsceneLabel)}" aria-pressed="false">${icon('speaker')}</button>`
      : '';
    app.innerHTML = `
      <section class="cutscene" data-cutscene="${escapeHtml(cue.id)}" data-cutscene-mode="${mode}">
        <div class="cutscene-controls">
          ${muteButtonHtml}
          <button type="button" class="cutscene-button" id="cutscene-skip">${escapeHtml(ui.skipCutsceneLabel)}${icon('skip')}</button>
        </div>
      </section>
    `;
    const section = app.querySelector<HTMLElement>('.cutscene');
    if (!section) {
      finish();
      return undefined;
    }
    section.prepend(media);

    // 剛出現那一下的點擊當成前一個畫面的連點，不算跳過。
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
    return section;
  }

  function showVideo(): void {
    if (!mountStage(video, true)) return;
    const muteButton = app.querySelector<HTMLButtonElement>('#cutscene-mute');

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
    muteButton?.addEventListener('click', () => applyMuted(!video.muted, true));

    // 預設靜音一定能自動播；玩家開了聲音而被瀏覽器擋下時，
    // 退一步改成靜音再試，再失敗就跳過影片，不讓玩家卡住。
    void video.play().catch(() => {
      if (done) return;
      applyMuted(true);
      void video.play().catch(finish);
    });
  }

  /**
   * 分鏡 placeholder：依序顯示每一格，停留分鏡表的剪輯秒數，格與格之間交叉淡化，
   * 每格帶一點緩慢推近，讓靜態圖讀起來仍是「過場」而不是一張投影片。
   * 第一格載得到才蓋上畫面（沿用同一個逾時計時），其餘格在背景預先下載；
   * 某一格載入失敗就跳到下一格，最後一格播完即進場景。
   */
  function playStoryboard(frames: StoryboardFrame[]): void {
    mode = 'storyboard';
    stopVideo();

    const images = frames.map(() => {
      const image = new Image();
      image.className = 'cutscene-frame';
      // 圖本身是裝飾，整體由外層的 aria-label 描述，避免螢幕閱讀器逐張念檔名。
      image.alt = '';
      image.decoding = 'async';
      return image;
    });
    const [first] = images;
    if (!first) {
      finish();
      return;
    }
    first.addEventListener('load', () => {
      if (done || shown) return;
      reveal();
      startStoryboard(frames, images);
    }, { once: true });
    first.addEventListener('error', finish, { once: true });
    images.forEach((image, index) => { image.src = frames[index]!.src; });
  }

  function startStoryboard(frames: StoryboardFrame[], images: HTMLImageElement[]): void {
    const stage = document.createElement('div');
    stage.className = 'cutscene-storyboard';
    stage.setAttribute('role', 'img');
    stage.setAttribute('aria-label', ui.cutsceneLabel);
    stage.append(...images);
    if (!mountStage(stage, false)) return;

    let index = -1;
    const next = (): void => {
      if (done) return;
      index += 1;
      const frame = frames[index];
      const image = images[index];
      if (!frame || !image) {
        finish();
        return;
      }
      const showFrame = (): void => {
        if (done) return;
        // 推近動畫比停留時間多一段淡出，下一格淡入時這一格仍在動，不會定格再消失。
        image.style.animationDuration = `${frame.seconds * 1000 + STORYBOARD_FADE_MS}ms`;
        image.classList.add('is-shown');
        images.forEach((other) => other.classList.toggle('is-active', other === image));
        frameTimer = window.setTimeout(next, frame.seconds * 1000);
      };
      if (image.complete) {
        if (image.naturalWidth > 0) showFrame();
        else next();
        return;
      }
      image.addEventListener('load', showFrame, { once: true });
      image.addEventListener('error', next, { once: true });
    };
    next();
  }

  video.src = cue.src;
  video.load();
}
