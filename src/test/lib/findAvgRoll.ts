import { Monster } from "oldschooljs";

export function findAvgRoll(
  m: Monster,
  kills: number,
  instances: number,
  items: string[]
) {
  const r = m.kill(kills, {}).items();
  const t = Object.fromEntries(
    r
      .map((r) => [r[0].name, [r[1]]] as [string, number[]])
      .sort((a, b) => a[0].localeCompare(b[0]))
      .filter((i) =>
        items.some((itm) => i[0].toLowerCase().includes(itm.toLowerCase()))
      )
  );

  for (let x = 0; x < instances - 1; x++) {
    const tr = m.kill(kills, {}).items();
    tr.forEach((item) => {
      if (t[item[0].name]) {
        t[item[0].name].push(item[1]);
      }
    });
  }

  const ents = Object.entries(t);
  const test: { [k: string]: number } = {};
  for (const [k, v] of ents) {
    test[k] = v.reduce((a, b) => a + b) / v.length;
  }

  test["kpi"] = kills;
  test["instances"] = instances;
  test["avg each"] = Object.keys(test)
    .flatMap((k) => {
      if (k !== "kpi" && k !== "instances") {
        return [test[k]];
      }
      return [];
    })
    .reduce((a, b, i, arr) => a + b / arr.length, 0);

  console.log(test);
}
