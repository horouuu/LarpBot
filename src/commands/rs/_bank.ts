import { CommandContext } from "@types-local/commands";
import { APIEmbedField, EmbedBuilder } from "discord.js";
import { Items } from "oldschooljs";

export async function getInventoryEmbed(ctx: CommandContext) {
  const { interaction, storage } = ctx;
  const inv = await storage.getInventory(interaction.user.id);
  const invEntries = Object.entries(inv);
  const invData: APIEmbedField[] = invEntries
    .flatMap((entry, i, a) => {
      const itemName = Items.find((v, k) => parseInt(entry[0]) == k)?.name;
      if (!itemName || !parseInt(entry[1])) return [];
      const out = { name: itemName, value: entry[1], inline: true };
      return i % 2 === 1 && i < a.length - 1
        ? [out, { name: "\t", value: "\t" }]
        : [out];
    })
    .splice(0, 14);

  return new EmbedBuilder()
    .setAuthor({
      iconURL: interaction.user.avatarURL() ?? "",
      name: interaction.user.displayName,
    })
    .setTitle(`${interaction.user.displayName}'s bank`)
    .addFields(invData);
}
