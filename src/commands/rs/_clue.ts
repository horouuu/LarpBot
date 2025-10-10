import { CommandContext } from "@types-local/commands";
import { Clues, Util } from "oldschooljs";
import { parseLoot } from "./_rs_utils";

const clueList = [
  { tier: Clues.Medium, num: 1, name: "Medium" },
  { tier: Clues.Hard, num: 1, name: "Hard" },
  { tier: Clues.Elite, num: 1, name: "Elite" },
  { tier: Clues.Master, num: 1, name: "Master" },
];

export async function openClue(ctx: CommandContext) {
  const { interaction } = ctx;
  const roll = Math.round(Math.random() * 3);
  const res = clueList[roll];
  const rewards = res.tier.open(res.num).items();

  const { got, total } = parseLoot(rewards);

  await interaction.reply(
    `You opened a **[${res.name}]** clue scroll!\n${got}\n### Total loot: ${total}`
  );
}
