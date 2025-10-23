import { CommandContext } from "@types-local/commands";
import { Clues } from "oldschooljs";
import { getEmptyClueData, parseLoot } from "./_rs-utils.js";
import { toKMB } from "oldschooljs/dist/util/smallUtils.js";
import { EmbedBuilder, MessageFlags } from "discord.js";

const clueList = [
  { tier: Clues.Medium, num: 1, name: "Medium" },
  { tier: Clues.Hard, num: 1, name: "Hard" },
  { tier: Clues.Elite, num: 1, name: "Elite" },
  { tier: Clues.Master, num: 1, name: "Master" },
];

async function checkCooldown(ctx: CommandContext): Promise<boolean> {
  const { interaction, storage } = ctx;
  const cd = await storage.checkCdByKey(interaction.user.id, "clues");

  if (cd > 0) {
    await interaction.reply({
      content: `You are currently on cooldown for clues!\nYou can try again in ${Math.floor(
        cd
      )} second(s).`,
      flags: [MessageFlags.Ephemeral],
    });

    return true;
  }

  return false;
}

export async function openClue(ctx: CommandContext) {
  const { interaction, storage } = ctx;

  if (await checkCooldown(ctx)) return;

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

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(
          totalRaw >= 1000000000
            ? "Fuchsia"
            : totalRaw >= 100000000
            ? "Red"
            : totalRaw >= 7500000
            ? "Gold"
            : "Greyple"
        )
        .setAuthor({
          name: interaction.user.displayName,
          iconURL: interaction.user.displayAvatarURL() ?? "",
        })
        .setTitle(`Clue scroll (${res.name.toLowerCase()})`)
        .setDescription(`${got}`)
        .setFooter({ text: `Total loot: ${total}` }),
    ],
  });

  await storage.setCdByKey(interaction.user.id, "clues", 12);
  await storage.updateInventory(interaction.user.id, rewards);
}

export async function showClueStats(ctx: CommandContext) {
  const { interaction, storage } = ctx;
  const userClueData = await storage.getClueData(interaction.user.id);
  const totalClues = [
    userClueData.medium,
    userClueData.hard,
    userClueData.elite,
    userClueData.master,
  ]
    .map((d) => parseInt(d))
    .reduce((prev, curr) => prev + curr);

  await interaction.reply(
    `### ${interaction.user}'s Clue Stats\n\`\`\`\n${
      userClueData.medium
    }x Medium\n${userClueData.hard}x Hard\n${userClueData.elite}x Elite\n${
      userClueData.master
    }x Master\`\`\`You've earned **${toKMB(
      parseInt(userClueData.clueCoins)
    )}** coins from ${totalClues} clue(s).`
  );
}
