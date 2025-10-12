import { RedisStorage } from "@redis-storage";
import { Item, Util } from "oldschooljs";

type DBClueData = {
  medium: number;
  hard: number;
  elite: number;
  master: number;
  clue_coins: number;
};

function getEmptyClueData(): DBClueData {
  return {
    medium: 0,
    hard: 0,
    elite: 0,
    master: 0,
    clue_coins: 0,
  } as DBClueData;
}

function getClueKey(userId: string) {
  return `users:${userId}:rs:clues`;
}

function getCoinsKey(userId: string) {
  return `users:${userId}:rs:coins`;
}

function getKcKey(userId: string, monsterId: number) {
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

export async function updateClueData(
  storage: RedisStorage,
  userId: string,
  data: DBClueData
) {
  const clueKey = getClueKey(userId);
  await storage.hIncrByFields(clueKey, data);
}

export async function getClueData(storage: RedisStorage, userId: string) {
  const clueKey = getClueKey(userId);
  return await storage.hGetAll(clueKey);
}

export async function updateCoins(
  storage: RedisStorage,
  userId: string,
  change: number
) {
  const coinsKey = getCoinsKey(userId);
  await storage.set(coinsKey, change.toString());
}
