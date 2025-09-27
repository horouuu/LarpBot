import { CacheType, Interaction } from "discord.js";

export interface Command {
  name: string;
  description: string;
  execute: (interaction: Interaction<CacheType>) => any;
}
