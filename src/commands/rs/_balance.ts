import { CommandContext } from "@types-local/commands";
import { EmbedBuilder } from "discord.js";

export async function checkBalance(ctx: CommandContext) {
  const { interaction, storage } = ctx;
  const bal = await storage.getCoins(interaction.user.id);
  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor("DarkGold")
        .setAuthor({
          name: interaction.user.username,
          iconURL: interaction.user.avatarURL() ?? "",
        })
        .setDescription(`**Balance**\n${bal.toLocaleString()} coins`),
    ],
  });
}
