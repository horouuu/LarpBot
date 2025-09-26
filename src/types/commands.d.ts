import { CacheType, Interaction } from "discord.js";

interface Command {
  name: string;
  description: string;
  execute: (interaction: Interaction<CacheType>) => any;
}
