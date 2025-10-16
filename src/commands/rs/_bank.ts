import { CommandContext } from "@types-local/commands";
import {
  ActionRowBuilder,
  APIEmbedField,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import { Item, Items } from "oldschooljs";
import { toKMB } from "oldschooljs/dist/util";

export async function getInventoryEmbed(ctx: CommandContext) {
  const { interaction, storage } = ctx;
  const inv = await storage.getInventory(interaction.user.id);
  const coins = await storage.getCoins(interaction.user.id);

  const invEntries = Object.entries(inv).map((entry) => {
    const item = Items.find((_, k) => parseInt(entry[0]) == k);
    return [item ?? null, entry[1]] as [Item | null, string];
  });
  const totalValue = invEntries.reduce((prev, curr) => {
    if (!curr[0]) return 0;
    return prev + curr[0].price;
  }, 0);

  const invData: APIEmbedField[] = invEntries
    .flatMap((entry) => {
      if (!entry[0] || !parseInt(entry[1]) || parseInt(entry[1]) === 0)
        return [];
      const totalItemValue = parseInt(entry[1]) * entry[0].price;
      return {
        name: entry[0].name,
        value: `${entry[1]}x (${toKMB(totalItemValue)})`,
        valueRaw: totalItemValue,
        inline: true,
      };
    })
    .sort((a, b) => b.valueRaw - a.valueRaw);

  // Add spaces every 3 items
  for (let i = 3; i < invData.length; i += 4) {
    if (i % 19 == 0) {
      i--;
      continue;
    }
    invData.splice(i, 0, { name: "\t", value: "\t" });
  }

  const embeds = [];
  const interval = 19;
  for (let i = 0; i < invData.length; i += interval) {
    const embed = new EmbedBuilder()
      .setAuthor({
        iconURL: interaction.user.avatarURL() ?? "",
        name: interaction.user.displayName,
      })
      .setTitle(
        `${interaction.user.displayName}'s bank (${toKMB(totalValue + coins)})`
      )
      .setDescription(`**Coins | ${toKMB(coins)}**`)
      .setFooter({
        text: `Page ${i / interval + 1}/${Math.ceil(
          invData.length / interval
        )}`,
      })
      .addFields(invData.slice(i, i + interval))
      .setColor("DarkGold");

    embeds.push(embed);
  }

  const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("bank_back")
      .setLabel("Back")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId("bank_next")
      .setLabel("Next")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(embeds.length <= 1)
  );

  return { embeds, actionRow };
}
