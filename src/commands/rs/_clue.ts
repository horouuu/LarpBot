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
    const mins = Math.floor(cd / 60);
    await interaction.reply({
      content: `You are currently on cooldown for clues!\nYou can try again in ${
        mins >= 1 ? `${mins} minute(s)` : `${cd} second(s).`
      }`,
      flags: [MessageFlags.Ephemeral],
    });

    return true;
  }

  return false;
}

export async function openClue(ctx: CommandContext) {
  const { interaction, storage } = ctx;
  const numberToOpen = interaction.options.getNumber("number") ?? 1;
  const cdSecsPerClue =
    numberToOpen >= 5 ? 12 * 2 : numberToOpen > 1 ? 12 + 4.5 : 12;
  const bulkLimit = Math.floor(300 / cdSecsPerClue);
  if (await checkCooldown(ctx)) return;
  if (numberToOpen > bulkLimit) {
    return await interaction.reply({
      content: `You may only open up to five minutes' worth of clues at a time (${bulkLimit}).`,
      flags: [MessageFlags.Ephemeral],
    });
  }

  const roll = Math.round(Math.random() * 3);
  const res = clueList[roll];
  const rewards = res.tier
    .open(res.num * numberToOpen)
    .items()
    .sort((a, b) => b[0].price - a[0].price);

  const { got, total, totalRaw } = parseLoot(rewards);

  const lines = got.split("\n").length;

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
        .setTitle(
          `${
            numberToOpen > 1 ? `${numberToOpen}x ` : ""
          }Clue scroll (${res.name.toLowerCase()})`
        )
        .setDescription(
          `${
            lines <= 5
              ? got
              : `${got.split("\n").slice(0, 5).join("\n")}\n...and ${
                  lines - 5
                } more lines...`
          }`
        )
        .setFooter({ text: `Total loot: ${total}` }),
    ],
  });

  await storage.setCdByKey(
    interaction.user.id,
    "clues",
    cdSecsPerClue * numberToOpen
  );
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
