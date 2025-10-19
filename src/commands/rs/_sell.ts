import { CommandContext } from "@types-local/commands";
import { MessageFlags } from "discord.js";
import { Items } from "oldschooljs";

export async function sellItems(ctx: CommandContext) {
  const { interaction, storage } = ctx;
  const itemName = interaction.options.getString("item", true);
  const quantity = interaction.options.getInteger("quantity") || 1;
  const userInv = await storage.getInventory(interaction.user.id);
  const item = Items.find((item) =>
    item.name.toLowerCase().includes(itemName.toLowerCase())
  );
  if (!item) {
    return await interaction.reply({
      content: `Item \`${itemName}\` not found.`,
      flags: [MessageFlags.Ephemeral],
    });
  }

  if (Object.keys(userInv).includes(item.id.toString())) {
    const itemNum = userInv[item.id.toString()];

    if (quantity <= parseInt(itemNum)) {
      const value = item.price * quantity;
      await storage.updateCoins(interaction.user.id, value);
      return await interaction.reply({
        content: `You have sold \`${quantity} x ${
          item.name
        }\` for \`${value.toLocaleString()}\` coins.`,
      });
    } else {
      return await interaction.reply({
        content: `You do not have enough of the item \`${item.name}\` to sell. You only have \`${itemNum}\`.`,
        flags: [MessageFlags.Ephemeral],
      });
    }
  } else {
    return await interaction.reply({
      content: `You do not have the item \`${item.name}\` in your bank.`,
      flags: [MessageFlags.Ephemeral],
    });
  }
}
