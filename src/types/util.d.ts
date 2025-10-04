type AtLeastOne<T, Keys extends keyof T = keyof T> = {
  [K in Keys]-?: Required<Pick<T, K>> &
    Partial<Record<Exclude<Keys, K>, undefined>>;
}[Keys];

type OrNullEntries<T> = { [K in keyof T]: T[K] | null };
export type { AtLeastOne, OrNullEntries };

export enum EmojiEnum {
  EMOJI_AYE = "✅",
  EMOJI_NAY = "❌",
  EMOJI_BYE = "👋",
  EMOJI_WELCOME = "🎉",
}
