import { Item, Util } from "oldschooljs";

export type DBClueData = {
  medium: number;
  hard: number;
  elite: number;
  master: number;
  clueCoins: number;
};

export function getEmptyClueData(): DBClueData {
  return {
    medium: 0,
    hard: 0,
    elite: 0,
    master: 0,
    clueCoins: 0,
  } as DBClueData;
}

export function getClueKey(userId: string) {
  return `users:${userId}:rs:clues`;
}

export function getCoinsKey(userId: string) {
  return `users:${userId}:rs:coins`;
}

export function getKcKey(userId: string, monsterId: number) {
  return `user:${userId}:rs:kills:${monsterId}`;
}

export function parseLoot(rewards: [Item, number][]) {
  let total = 0;

  const got = rewards
    .map((r) => {
      const item = r[0];
      const amt = r[1];

      total += item.price * amt;
      return `${amt}x [${item.name}](<${item.wiki_url}>) (${Util.toKMB(
        item.price * amt
      )})`;
    })
    .join("\n");

  const totalStr = Util.toKMB(total);
  return { got, total: totalStr, totalRaw: total };
}
