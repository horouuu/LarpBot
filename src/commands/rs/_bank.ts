import { CommandContext } from "@types-local/commands";
import {
  ActionRowBuilder,
  APIEmbedField,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import { Items } from "oldschooljs";

export async function getInventoryEmbed(ctx: CommandContext) {
  const { interaction, storage } = ctx;
  const inv = await storage.getInventory(interaction.user.id);
  const invEntries = Object.entries(inv);
  const invData: APIEmbedField[] = invEntries
    .flatMap((entry, i, a) => {
      const itemName = Items.find((_, k) => parseInt(entry[0]) == k)?.name;
      if (!itemName || !parseInt(entry[1])) return [];
      return { name: itemName, value: entry[1], inline: true };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

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
      .setTitle(`${interaction.user.displayName}'s bank`)
      .setDescription(
        `Page ${i / interval + 1}/${Math.ceil(invData.length / interval)}`
      )
      .addFields(invData.slice(i, i + interval));

    console.log(invData.slice(i, i + interval));
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
  );

  return { embeds, actionRow };
}
