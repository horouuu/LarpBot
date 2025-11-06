import { CommandContext } from "@types-local/commands";
import { SlashCommandSubcommandBuilder } from "discord.js";

const buildPcSubcommand = (opt: SlashCommandSubcommandBuilder) => {
  opt
    .setName("pc")
    .setDescription("Uses the Wiki API to check the average price of an item.")
    .addStringOption((opt) =>
      opt
        .setName("item")
        .setDescription("Item to price-check.")
        .setRequired(true)
    );
};

async function priceCheck(ctx: CommandContext) {}
