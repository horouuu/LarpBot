import { ColorResolvable } from "discord.js";
import { Item, Items, Util } from "oldschooljs";
import { MonsterData } from "oldschooljs/dist/meta/monsterData";
import SimpleMonster from "oldschooljs/dist/structures/SimpleMonster";

export type DBClueData<T extends string | number> = {
  medium: T;
  hard: T;
  elite: T;
  master: T;
  clueCoins: T;
};

export type DB1hPricesData = {
  data: {
    [itemId: number]: {
      avgHighPrice: number;
      highPriceVolume: number;
      avgLowPrice: number;
      lowPriceVolume: number;
    };
  };
  timestamp: string;
};

export function getEmptyClueData<T extends string | number = number>(
  string: boolean = false
): DBClueData<T> {
  if (!string) {
    return {
      medium: 0,
      hard: 0,
      elite: 0,
      master: 0,
      clueCoins: 0,
    } as DBClueData<T>;
  } else {
    return {
      medium: "0",
      hard: "0",
      elite: "0",
      master: "0",
      clueCoins: "0",
    } as DBClueData<T>;
  }
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
      const price = item.id === 995 ? 1 : item.price;

      total += price * amt;
      return `${amt}x [${item.name}](<${item.wiki_url}>) (${Util.toKMB(
        price * amt
      )})`;
    })
    .join("\n");

  const totalStr = Util.toKMB(total);
  return { got, total: totalStr, totalRaw: total };
}

export function attachWikiURL(monster: SimpleMonster, wikiURL: string) {
  monster.data = {} as MonsterData;
  monster.data.wikiURL = wikiURL;
}

export function getTierColor(
  value: number,
  defaultColor: ColorResolvable = "Greyple"
) {
  return value >= 1000000000
    ? "Fuchsia"
    : value >= 100000000
    ? "Red"
    : value >= 7500000
    ? "Gold"
    : defaultColor;
}

export function getMinsOrSecsText(
  secs: number,
  mode: "default" | "verbose" = "default"
) {
  const getS = (num: number) => (num !== 1 ? "s" : "");
  const mins = secs / 60;
  const out =
    mins < 1
      ? `${secs} second${getS(secs)}`
      : `${Math.floor(mins)} minute${getS(Math.floor(mins))}`;
  const verbose = `${Math.floor(mins)} minute${getS(Math.floor(mins))} and ${
    secs % 60
  } second${getS(secs % 60)}`;
  return mode === "verbose" ? verbose : out;
}

export function findItemFuzzy(input: string) {
  return Items.find((i) =>
    i.name.toLowerCase().includes(input.trim().toLowerCase())
  );
}
