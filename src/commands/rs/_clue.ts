import { CommandContext } from "@types-local/commands";
import { Clues } from "oldschooljs";
import { getEmptyClueData, parseLoot } from "./_rs_utils.js";
import { toKMB } from "oldschooljs/dist/util/smallUtils.js";

const clueList = [
  { tier: Clues.Medium, num: 1, name: "Medium" },
  { tier: Clues.Hard, num: 1, name: "Hard" },
  { tier: Clues.Elite, num: 1, name: "Elite" },
  { tier: Clues.Master, num: 1, name: "Master" },
];

export async function openClue(ctx: CommandContext) {
  const { interaction, storage } = ctx;
  const roll = Math.round(Math.random() * 3);
  const res = clueList[roll];
  const rewards = res.tier.open(res.num).items();

  const { got, total, totalRaw } = parseLoot(rewards);

  const toUpdate = getEmptyClueData();
  const clueType = res.name.toLowerCase() as
    | "medium"
    | "hard"
    | "elite"
    | "master";
  toUpdate[clueType] = 1;
  toUpdate.clueCoins = totalRaw;

  await storage.updateClueData(interaction.user.id, toUpdate);

  await interaction.reply(
    `You opened a **[${res.name}]** clue scroll!\n${got}\n### Total loot: ${total}`
  );
}

export async function showClueStats(ctx: CommandContext) {
  const { interaction, storage } = ctx;
  const userClueData = await storage.getClueData(interaction.user.id);

  await interaction.reply(
    `### ${interaction.user}'s Clue Stats\n\`\`\`\n${
      userClueData.medium
    }x Medium\n${userClueData.hard}x Hard\n${userClueData.elite}x Elite\n${
      userClueData.master
    }x Master\`\`\`You've earned **${toKMB(
      userClueData.clueCoins
    )}** coins from clues.`
  );
}
