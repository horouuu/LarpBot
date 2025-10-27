import { Command, CommandContext } from "@types-local/commands";
import { MessageFlags, SlashCommandBuilder } from "discord.js";

const pingData = new SlashCommandBuilder()
  .setName("ping")
  .setDescription('Replies with "Pong!"');

const ping = {
  ...pingData.toJSON(),
  execute: async (cmdContext: CommandContext) => {
    const { interaction } = cmdContext;
    if (!interaction.isChatInputCommand()) return;

    try {
      await interaction.reply({
        content: "Pong!",
        flags: MessageFlags.Ephemeral,
      });
    } catch (e) {}
  },
} satisfies Command;

export { ping };
