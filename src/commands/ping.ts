import { Command, CommandContext } from "@types-local/commands";

const ping = {
  name: "ping",
  description: 'Replies with "Pong!"',
  execute: async (cmdContext: CommandContext) => {
    const { interaction } = cmdContext;
    if (!interaction.isChatInputCommand()) return;

    try {
      await interaction.reply("Pong!");
    } catch (e) {}
  },
} satisfies Command;

export { ping };
