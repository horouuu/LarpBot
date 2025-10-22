import { promptConfirmationDialog } from "@commands/lib/_cmd-utils";
import { CommandContext } from "@types-local/commands";
import { ButtonInteraction, EmbedBuilder, MessageFlags } from "discord.js";
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
    const handleConfirm = async (i: ButtonInteraction) => {
      const value = item.price * quantity;
      await storage.updateInventory(interaction.user.id, [[item, -quantity]]);
      await storage.updateCoins(interaction.user.id, value);
      await i.update({
        embeds: [
          new EmbedBuilder()
            .setDescription("Sell request sent.")
            .setColor("DarkGreen"),
        ],
        components: [],
      });

      const channel = i.channel;
      const content = {
        embeds: [
          new EmbedBuilder()
            .setAuthor({
              name: interaction.user.displayName,
              iconURL: interaction.user.avatarURL() ?? "",
            })
            .setTitle(`Sold: ${quantity}x ${item.name}`)
            .setDescription(
              `${interaction.user.displayName} sold \`${quantity}x ${
                item.name
              }\` for \`${value.toLocaleString()}\` coins.`
            )
            .setColor("DarkGold"),
        ],
        components: [],
      };
      if (channel?.isSendable()) {
        await channel.send(content);
      } else {
        await i.followUp(content);
      }
    };

    const handleCancel = async (i: ButtonInteraction) =>
      await i.update({
        embeds: [
          new EmbedBuilder()
            .setDescription("Cancelled sell request.")
            .setColor("DarkRed"),
        ],
        components: [],
      });

    const handleExpiry = async () =>
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription("Sell request expired.")
            .setColor("DarkRed"),
        ],
        components: [],
      });

    await promptConfirmationDialog(
      interaction,
      {
        handleConfirm,
        handleCancel,
        handleExpiry,
      },
      {
        confirmButtonLabel: "Sell",
        cancelButtonLabel: "Cancel",
        title: `Selling: ${quantity}x ${item.name}`,
        prompt: `Are you sure you wish to sell \`${quantity}x ${item.name}\`?`,
      }
    );
  } else {
    const responseMsg =
      parseInt(itemNum) > 0
        ? `You do not have enough of the item \`${item.name}\` to sell. You only have \`${itemNum}\`.`
        : `You don't have any \`${itemName}\` in your bank!`;
    return await interaction.reply({
      content: responseMsg,
      flags: [MessageFlags.Ephemeral],
    });
  }
}
