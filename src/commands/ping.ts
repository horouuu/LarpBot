import { Command, CommandContext } from "@types-local/commands";
import { MessageFlags } from "discord.js";

const ping = {
  name: "ping",
  description: 'Replies with "Pong!"',
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
