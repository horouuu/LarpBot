import { CacheType, Interaction } from "discord.js";
import { Command } from "../types/commands";

const ping = {
  name: "ping",
  description: 'Replies with "Pong!"',
  execute: async (interaction: Interaction<CacheType>) => {
    if (!interaction.isChatInputCommand()) return;
    await interaction.reply("Pong!");
  },
} satisfies Command;

export { ping };
