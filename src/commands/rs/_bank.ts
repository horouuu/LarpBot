import { CommandContext } from "@types-local/commands";
import {
  ActionRowBuilder,
  APIEmbedField,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  InteractionCallbackResponse,
} from "discord.js";
import { Item, Items, Util } from "oldschooljs";

export async function getInventoryEmbeds(ctx: CommandContext) {
  const { interaction, storage } = ctx;
  const inv = await storage.getInventory(interaction.user.id);
  const coins = await storage.getCoins(interaction.user.id);

  const invEntries = Object.entries(inv).map((entry) => {
    const item = Items.find((_, k) => parseInt(entry[0]) == k);
    return [item ?? null, entry[1]] as [Item | null, string];
  });
  const totalValue = invEntries.reduce((prev, curr) => {
    if (!curr[0]) return 0;
    return prev + (curr[0].price ?? 0);
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

export async function handleBankPages(
  ctx: CommandContext,
  msg: InteractionCallbackResponse<boolean>,
  components: Awaited<ReturnType<typeof getInventoryEmbeds>>
) {
  const { interaction } = ctx;
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
