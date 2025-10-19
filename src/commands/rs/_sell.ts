import { CommandContext } from "@types-local/commands";
import { SlashCommandBuilder } from "discord.js";
import { Items } from "oldschooljs";

export async function sellItems(ctx: CommandContext) {
    const { interaction } = ctx;
    const itemName = interaction.options.getString("item", true);
    const quantity = interaction.options.getInteger("quantity") || 1;
    // Check user has enough of the item
    
    // Perform the sale
    Items.find((item) => 
        item.name.toLowerCase().includes(itemName.toLowerCase())
    )
}