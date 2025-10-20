import { CommandContext } from "@types-local/commands";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CacheType,
  ComponentType,
  EmbedBuilder,
  InteractionCollector,
  MessageFlags,
} from "discord.js";
import { Item, Items } from "oldschooljs";

type HandlerContext = {
  collector: InteractionCollector<ButtonInteraction<CacheType>>;
  i: ButtonInteraction<CacheType>;
} & CommandContext;

async function handleEnd(ctx: CommandContext, reason: string) {
  const { interaction } = ctx;
  if (reason === "time") {
    try {
      return await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription("Sell request expired.")
            .setColor("DarkRed"),
        ],
        components: [],
      });
    } catch (e) {
      console.error(e);
    }
  }
}

async function handleCollect(
  ctx: HandlerContext,
  item: Item,
  quantity: number
) {
  const { collector, i, interaction, storage } = ctx;
  try {
    if (i.customId === "sell") {
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
      await i.followUp({
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
      });
    } else {
      await i.update({
        embeds: [
          new EmbedBuilder()
            .setDescription("Cancelled sell request.")
            .setColor("DarkRed"),
        ],
        components: [],
      });
    }
  } catch (e) {
    console.error(e);
  }

  collector.stop();
}

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
    const msg = await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`Selling: ${quantity}x ${item.name}`)
          .setDescription(
            `Are you sure you wish to sell \`${quantity}x ${item.name}\`?`
          )
          .setColor("DarkRed"),
      ],
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId("sell")
            .setLabel("Sell")
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId("cancel")
            .setLabel("Cancel")
            .setStyle(ButtonStyle.Secondary)
        ),
      ],
      flags: [MessageFlags.Ephemeral],
      withResponse: true,
    });

    const collector = msg.resource?.message?.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      time: 15000,
      componentType: ComponentType.Button,
    });

    collector?.on("collect", (i) =>
      handleCollect({ collector, i, ...ctx }, item, quantity)
    );

    collector?.on("end", async (_, reason) => handleEnd(ctx, reason));
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
