import { CommandContext } from "@types-local/commands";
import { MessageFlags } from "discord.js";
import { Items } from "oldschooljs";

export async function sellItems(ctx: CommandContext) {
  const { interaction, storage } = ctx;
  const itemName = interaction.options.getString("item", true);
  const quantity = Math.max(interaction.options.getInteger("quantity") || 1, 1);
  const userInv = await storage.getInventory(interaction.user.id);

  const found = Object.keys(userInv).filter((itemId) => {
    const targetItem = Items.find((i) => i.id.toString() === itemId);
    const name = targetItem?.name;

    if (!name) return false;
    return (
      name.toLowerCase().includes(itemName.toLowerCase()) &&
      parseInt(userInv[targetItem.id]) > 0
    );
  });

  if (found.length === 0) {
    return await interaction.reply({
      content: `No items in your bank match the input \`${itemName}\`!`,
      flags: [MessageFlags.Ephemeral],
    });
  } else if (found.length > 1) {
    const numShowItems = 3;

    const rest = found.length - numShowItems;
    const foundNames = found
      .map((itemId) => Items.find((i) => i.id.toString() === itemId))
      .filter((i) => !!i)
      .map((i) => `- \`${i.name}\``)
      .slice(0, numShowItems)
      .join("\n");
    return await interaction.reply({
      content: `The input \`${itemName}\` is too ambiguous! Did you mean one of the following items?\n${foundNames}${
        rest > 0 ? `\n...and ${rest} more item(s).` : ""
      }`,
      flags: [MessageFlags.Ephemeral],
    });
  }

  const item = Items.find((i) => i.id.toString() === found[0]);
  if (!item) {
    return await interaction.reply({
      content: `No items in your bank match the input \`${itemName}\`!`,
      flags: [MessageFlags.Ephemeral],
    });
  }

  const itemNum = userInv[item.id.toString()];
  if (quantity <= parseInt(itemNum)) {
    const value = item.price * quantity;

    // prompt users first before selling

    await storage.updateInventory(interaction.user.id, [[item, -quantity]]);
    await storage.updateCoins(interaction.user.id, value);
    return await interaction.reply({
      content: `You have sold \`${quantity} x ${
        item.name
      }\` for \`${value.toLocaleString()}\` coins.`,
    });
  } else {
    const msg =
      parseInt(itemNum) > 0
        ? `You do not have enough of the item \`${item.name}\` to sell. You only have \`${itemNum}\`.`
        : `You don't have any \`${itemName}\` in your bank!`;
    return await interaction.reply({
      content: msg,
      flags: [MessageFlags.Ephemeral],
    });
  }
}
