import type { Line, ScenePresentation } from '../domain/schema';

export interface ResolvedPresentation {
  /** 這一句要顯示的背景 ID；沒有背景時為 undefined。 */
  backgroundId?: string;
  /** 這一句要顯示的立繪角色 ID；不顯示任何人時為 undefined。 */
  characterId?: string;
}

export interface PresentationContext {
  /** 場景層級的視覺設定（images.json 的 scenePresentation）。 */
  presentation?: ScenePresentation;
  /** images.json 的 sceneBackgrounds 對應。 */
  sceneBackground?: string;
  /** 判斷某角色是否有立繪資產。 */
  hasSprite: (characterId: string) => boolean;
}

/**
 * 依「目前讀到第幾句」決定背景與立繪。
 *
 * 背景：取這一句（含）之前最後一個 `line.background`；都沒有就用場景層級設定。
 *
 * 立繪：`line.character` 是分鏡指示，會一直有效到同場景下一個 `line.character` 為止——
 * 指定角色 ID 就固定顯示那個人，指定 `null` 代表已離場、之後誰說話都不顯示。
 * 這一句之前沒有任何指示時，才「跟著說話者走」：取最後一位有立繪的說話者（對話與內心都算），
 * 再退回場景層級的 `character`；場景寫 `character: null` 則整場不顯示立繪。
 */
export function resolvePresentation(
  lines: readonly Line[],
  lineIndex: number,
  context: PresentationContext,
): ResolvedPresentation {
  const upTo = lines.slice(0, Math.max(0, lineIndex + 1));

  let backgroundId = context.presentation?.background ?? context.sceneBackground;
  for (let index = upTo.length - 1; index >= 0; index -= 1) {
    const background = upTo[index].background;
    if (background) {
      backgroundId = background;
      break;
    }
  }

  const overrideIndex = findLastIndex(upTo, (line) => line.character !== undefined);
  const speakerIndex = findLastIndex(upTo, (line) => line.speaker !== null && context.hasSprite(line.speaker));

  let characterId: string | undefined;
  if (overrideIndex >= 0) {
    // 台詞層級的分鏡指示最優先，連場景的 `character: null`（整場不顯示立繪）也能覆寫。
    characterId = upTo[overrideIndex].character ?? undefined;
  } else if (context.presentation?.hideCharacter) {
    characterId = undefined;
  } else if (speakerIndex >= 0) {
    characterId = upTo[speakerIndex].speaker ?? undefined;
  } else {
    characterId = context.presentation?.character;
  }

  return { backgroundId, characterId };
}

function findLastIndex<T>(items: readonly T[], predicate: (item: T) => boolean): number {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (predicate(items[index])) return index;
  }
  return -1;
}
