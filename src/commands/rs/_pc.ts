import { CommandContext } from "@types-local/commands";
import {
  EmbedBuilder,
  MessageFlags,
  SlashCommandSubcommandBuilder,
} from "discord.js";
import { DB1hPricesData, findItemFuzzy } from "./_rs-utils.js";
import { Util } from "oldschooljs";

export const buildPcSubcommand = (opt: SlashCommandSubcommandBuilder) =>
  opt
    .setName("pc")
    .setDescription("Uses the Wiki API to check the average price of an item.")
    .addStringOption((opt) =>
      opt
        .setName("item")
        .setDescription("Item to price-check.")
        .setRequired(true)
    );

export async function priceCheck(ctx: CommandContext) {
  const { interaction } = ctx;
  const inp = interaction.options.getString("item", true);
  const item = findItemFuzzy(inp);

  if (!item) {
    await interaction.reply({
      content: `Item \`${inp}\` not found.`,
      flags: [MessageFlags.Ephemeral],
    });
    return;
  }

  const rawData = await getOrFetchPriceData({ ...ctx, itemId: item.id });
  if (rawData === null) {
    await interaction.reply({
      content: `Data for item \`${item.name}\` not found.`,
      flags: [MessageFlags.Ephemeral],
    });
    return;
  }

  const { data, timestamp } = rawData;
  const date = new Date(parseInt(timestamp));
  const dateString = `${date.getUTCHours().toString().padStart(2, "0")}:${date
    .getUTCMinutes()
    .toString()
    .padStart(2, "0")}`;

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle(`Hourly prices for ${item.name}`)
        .setDescription(
          `Average High Price: \`${data.avgHighPrice.toLocaleString()}\`\nHigh Price Volume: \`${
            data.highPriceVolume
          }\`\n\nAverage Low Price: \`${data.avgLowPrice.toLocaleString()}\`\nLow Price Volume: \`${
            data.lowPriceVolume
          }\``
        )
        .setFooter({
          text: `Data taken at ${dateString} UTC`,
        })
        .setColor("DarkGold"),
    ],
  });
}

async function getOrFetchPriceData(ctx: CommandContext & { itemId: number }) {
  const { storage, itemId } = ctx;
  try {
    let data = await storage.check1hPrice(itemId);

    if (data === null) {
      console.log("Fetching hourly price data from Wiki API...\n");
      const fetched = await fetch(
        "https://prices.runescape.wiki/api/v1/osrs/1h",
        {
          method: "GET",
          headers: {
            "User-Agent": "LarpBot/1hPriceCheck - @godsel on Discord",
          },
        }
      );

      const rawData = (await fetched.json()) as DB1hPricesData;
      rawData.timestamp += "000";
      if (!rawData) return null;
      await storage.update1hPrices(rawData);
      console.log("Successfully updated DB entry for hourly prices\n");

      if (itemId in rawData.data) {
        data = {
          data: rawData.data[itemId],
          timestamp: rawData.timestamp,
        };
      } else {
        return null;
      }
    }

    return data;
  } catch (e) {
    console.error(e);
    throw new Error("Failed to get price data.");
  }
}
