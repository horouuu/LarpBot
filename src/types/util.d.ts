type AtLeastOne<T, Keys extends keyof T = keyof T> = Omit<T, Keys> &
  {
    [K in Keys]-?: Required<Pick<T, K>> &
      Partial<Record<Exclude<Keys, K>, undefined>>;
  }[Keys];

type OrNullEntries<T> = { [K in keyof T]: T[K] | null };

export type { AtLeastOne, OrNullEntries };
