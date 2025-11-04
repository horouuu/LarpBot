import { CommandContext } from "@types-local/commands";
import { EmbedBuilder, SlashCommandSubcommandBuilder } from "discord.js";

export const buildBalanceSubcommand = (opt: SlashCommandSubcommandBuilder) =>
  opt.setName("balance").setDescription("Check your coin balance.");

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
