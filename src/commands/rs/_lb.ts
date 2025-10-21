import { CommandContext } from "@types-local/commands";
import { EmojiEnum } from "@utils";
import { APIEmbedField, EmbedBuilder, MessageFlags } from "discord.js";

export async function showCoinLb(ctx: CommandContext) {
  const { interaction, storage } = ctx;
  const members = await interaction.guild?.members.fetch();
  if (!members) {
    return await interaction.reply({
      content: "Something went wrong.",
      flags: [MessageFlags.Ephemeral],
    });
  }

  const emojis = [
    EmojiEnum.EMOJI_FIRST_PLACE,
    EmojiEnum.EMOJI_SECOND_PLACE,
    EmojiEnum.EMOJI_THIRD_PLACE,
  ];

  const memIds = members.map((m) => m.id);
  const coinsData = await storage.getCoinsData(memIds);
  const fields: APIEmbedField[] = coinsData
    .map((data, i) => ({
      name: `${i < emojis.length ? emojis[i] : `${i + 1})`}${
        members.get(data[0])?.displayName
      }`,
      value: `${data[1].toLocaleString()}`,
      rawValue: data[1],
    }))
    .sort((a, b) => b.rawValue - a.rawValue)
    .slice(0, 10);

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle(`Coins leaderboard for ${interaction.guild?.name}`)
        .setColor("DarkGold")
        .addFields(fields)
        .setThumbnail(interaction.guild?.iconURL() ?? null),
    ],
  });
}
