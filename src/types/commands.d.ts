import { Config } from "@config";
import { CacheType, Interaction, ApplicationCommandOption } from "discord.js";

export interface Command {
  name: string;
  description: string;
  options?: ApplicationCommandOption[];
  execute: (interaction: Interaction<CacheType>, config?: Config) => any;
}
