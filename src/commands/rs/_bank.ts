import { promptConfirmationDialog } from "../lib/_cmd-utils.js";
import { CommandContext } from "@types-local/commands";
import {
  ActionRowBuilder,
  APIEmbedField,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  InteractionCallbackResponse,
  MessageFlags,
  SlashCommandSubcommandGroupBuilder,
} from "discord.js";
import { Item, Items, Util } from "oldschooljs";

export const buildBankSubcommandGroup = (
  opt: SlashCommandSubcommandGroupBuilder
) =>
  opt
    .setName("bank")
    .setDescription("View your bank.")
    .addSubcommand((opt) =>
      opt.setName("open").setDescription("Open your bank.")
    )
    .addSubcommand((opt) =>
      opt.setName("sellall").setDescription("Sell all items from your bank.")
    );

export async function getInventoryEmbeds(ctx: CommandContext) {
  const { interaction, storage } = ctx;
  const inv = await storage.getInventory(interaction.user.id);
  const coins = await storage.getCoins(interaction.user.id);

  const invEntries = Object.entries(inv).map((entry) => {
    const item = Items.find((_, k) => parseInt(entry[0]) == k);
    return [item ?? null, entry[1]] as [Item | null, string];
  });

  const totalValue = invEntries.reduce((prev, curr) => {
    if (!curr[0] || !parseInt(curr[1])) return prev;
    return prev + (curr[0].price ?? 0) * parseInt(curr[1]);
  }, 0);

  const invData: APIEmbedField[] = invEntries
    .flatMap((entry) => {
      if (!entry[0] || !parseInt(entry[1]) || parseInt(entry[1]) === 0)
        return [];
      const totalItemValue = parseInt(entry[1]) * entry[0].price;
      return {
        name: entry[0].name,
        value: `${entry[1]}x (${Util.toKMB(totalItemValue)})`,
        valueRaw: totalItemValue,
        inline: true,
      };
    })
    .sort((a, b) => b.valueRaw - a.valueRaw);

  // Add spaces every 3 items
  for (let i = 3; i < invData.length; i += 4) {
    if (i % 19 == 0) {
      i--;
      continue;
    }
    invData.splice(i, 0, { name: "\t", value: "\t" });
  }

  const embeds = [];
  const interval = 19;
  for (let i = 0; i < invData.length; i += interval) {
    const embed = new EmbedBuilder()
      .setAuthor({
        iconURL: interaction.user.avatarURL() ?? "",
        name: interaction.user.displayName,
      })
      .setTitle(
        `${interaction.user.displayName}'s bank (${Util.toKMB(
          totalValue + coins
        )})`
      )
      .setDescription(`**Coins | ${coins.toLocaleString()}**`)
      .setFooter({
        text: `Page ${i / interval + 1}/${Math.ceil(
          invData.length / interval
        )}`,
      })
      .addFields(invData.slice(i, i + interval))
      .setColor("DarkGold");

    embeds.push(embed);
  }

  const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("bank_back")
      .setLabel("Back")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId("bank_next")
      .setLabel("Next")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(embeds.length <= 1)
  );

  return { embeds, actionRow };
}

export async function handleBankPages(ctx: CommandContext) {
  const { interaction } = ctx;

  const components = await getInventoryEmbeds(ctx);
  if (components.embeds.length === 0)
    return await interaction.reply("You have no items!");

  const msg = await interaction.reply({
    embeds: [components.embeds[0]],
    components: [components.actionRow],
    withResponse: true,
  });

  const collector = msg.resource?.message?.createMessageComponentCollector({
    filter: (i) =>
      (i.customId === "bank_back" || i.customId === "bank_next") &&
      i.user.id == interaction.user.id,
    time: 30000,
    componentType: ComponentType.Button,
  });

  let page = 0;
  collector?.on("end", async (i) => {
    const content = {
      embeds: [components.embeds[page]],
      components: [],
    };
    if (interaction.deferred || interaction.replied) {
      interaction.editReply(content);
    } else {
      interaction.reply(content);
    }
  });

  collector?.on("collect", async (i) => {
    const deferTimer = setTimeout(
      () => i.deferUpdate().catch((e) => console.error("")),
      2500
    );
    switch (i.customId) {
      case "bank_next":
        if (page + 1 === components.embeds.length) return;
        page += 1;
        break;
      case "bank_back":
        if (page - 1 < 0) return;
        page -= 1;
        break;
      default:
        return;
    }

    const isFirst = page === 0;
    const isLast = page === components.embeds.length - 1;

    components.actionRow.components[0].setDisabled(isFirst);
    components.actionRow.components[1].setDisabled(isLast);

    const content = {
      embeds: [components.embeds[page]],
      components: [components.actionRow],
    };
    if (i.deferred) {
      await i.editReply(content);
    } else {
      await i.update(content);
    }

    deferTimer.close();
    collector.resetTimer();
  });
}
async function calculateTotalBankValue(ctx: CommandContext) {
  const { interaction, storage } = ctx;
  const userInv = await storage.getInventory(interaction.user.id);
  let totalValue = 0;
  const newBank: [Item, number][] = Object.entries(userInv).flatMap((i) => {
    const item = Items.find((it) => it.id.toString() === i[0]);
    if (!item || !item.price) return [];
    totalValue += item.price * parseInt(i[1]);
    return [[item, -i[1]]];
  });
  return { totalValue, newBank };
}

async function clearUserBank(
  ctx: CommandContext,
  newBank: [Item, number][],
  totalValue: number
) {
  const { interaction, storage } = ctx;
  const coins = Items.find((item) => item.id === 995);
  if (coins) {
    newBank.push([coins, totalValue]);
  } else {
    await storage.updateCoins(interaction.user.id, totalValue);
  }
  await storage.updateInventory(interaction.user.id, newBank);
}

export async function sellAllItems(ctx: CommandContext) {
  const { interaction } = ctx;
  const { totalValue, newBank } = await calculateTotalBankValue(ctx);

  if (totalValue === 0) {
    return await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setDescription(`You have nothing in your bank to sell!`)
          .setColor("DarkRed"),
      ],
      flags: [MessageFlags.Ephemeral],
    });
  }

  const handleSell = async (i: ButtonInteraction) => {
    const content = {
      embeds: [
        new EmbedBuilder()
          .setTitle("Items Sold")
          .setColor("DarkGold")
          .setAuthor({
            iconURL: interaction.user.avatarURL() ?? "",
            name: interaction.user.displayName,
          })
          .setDescription(
            `You have sold all items in your bank for \`${totalValue.toLocaleString()}\` coins.`
          ),
      ],
      components: [],
    };

    if (i.channel?.isSendable()) {
      await i.channel.send(content);
      await i.update({
        embeds: [
          new EmbedBuilder()
            .setColor("DarkGreen")
            .setDescription("Sell request sent."),
        ],
        components: [],
      });
    } else {
      await i.update(content);
    }

    await clearUserBank(ctx, newBank, totalValue);
  };

  const handleCancel = async (i: ButtonInteraction) => {
    await i.update({
      embeds: [
        new EmbedBuilder().setDescription("Sale cancelled").setColor("DarkRed"),
      ],
      components: [],
    });
  };

  const handleExpiry = async () => {
    await interaction.editReply({
      embeds: [
        new EmbedBuilder().setDescription("Sale expired").setColor("DarkRed"),
      ],
      components: [],
    });
  };

  await promptConfirmationDialog(
    interaction,
    { handleConfirm: handleSell, handleCancel, handleExpiry },
    {
      confirmButtonLabel: "Sell",
      title: "Selling: All items",
      prompt: `Are you sure you wish to sell all items in your bank for \`${totalValue.toLocaleString()}\` coins?`,
      expiryMs: 15000,
    }
  );
}
