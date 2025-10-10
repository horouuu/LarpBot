import { Item, Util } from "oldschooljs";

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
  return { got, total: totalStr };
}
