import { CacheType, Interaction, ApplicationCommandOption } from "discord.js";

export interface Command {
  name: string;
  description: string;
  options?: ApplicationCommandOption[];
  execute: (interaction: Interaction<CacheType>) => any;
}
