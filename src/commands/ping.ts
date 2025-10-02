import {
  Command,
  CommandContext,
  CommandContextRequire,
} from "@types-local/commands";

const ping = {
  name: "ping",
  description: 'Replies with "Pong!"',
  execute: async (cmdContext: CommandContext) => {
    const { interaction } = cmdContext;
    if (!interaction.isChatInputCommand()) return;
    await interaction.reply("Pong!");
  },
} satisfies Command;

export { ping };
