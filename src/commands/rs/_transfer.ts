import { CommandContext } from "@types-local/commands";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CacheType,
  ComponentType,
  EmbedBuilder,
  MessageFlags,
  User,
} from "discord.js";
import { Util } from "oldschooljs";

async function executeTransfer(
  ctx: CommandContext,
  p1: User,
  p2: User,
  value: number,
  i: ButtonInteraction<CacheType>
) {
  const { storage } = ctx;
  const amountKmb = Util.toKMB(value);
  await storage.updateCoins(p1.id, value * -1);
  await storage.updateCoins(p2.id, value);

  await i.update({
    embeds: [
      new EmbedBuilder()
        .setTitle(`Transfer to ${p2.displayName}`)
        .setColor("DarkGreen")
        .setDescription(
          `${p1} has successfully transferred ${value.toLocaleString()} coins to ${p2}.`
        ),
    ],
    components: [],
  });
}

export async function transferCoins(
  ctx: CommandContext,
  p1: User,
  p2: User,
  amountKmb: string
) {
  const { interaction, storage } = ctx;
  const value = Util.fromKMB(amountKmb);

  const owned = await storage.getCoins(p1.id);
  if (owned < value || Number.isNaN(value) || !value) {
    return await interaction.reply({
      content: "You do not have enough coins for this transfer.",
      flags: [MessageFlags.Ephemeral],
    });
  } else {
    const msg = await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`Transfer to ${p2.displayName}`)
          .setColor("DarkRed")
          .setDescription(
            `Are you sure you want to transfer ${value.toLocaleString()} coins to ${p2}?`
          ),
      ],
      components: [
        new ActionRowBuilder<ButtonBuilder>().setComponents(
          new ButtonBuilder()
            .setCustomId("yes")
            .setLabel("Yes")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId("no")
            .setLabel("No")
            .setStyle(ButtonStyle.Danger)
        ),
      ],
    });

    const collector = msg.createMessageComponentCollector({
      filter: (i) => i.user.id === p1.id,
      time: 15000,
      componentType: ComponentType.Button,
    });

    collector.on("collect", async (i) => {
      if (i.customId === "yes") {
        await executeTransfer(ctx, p1, p2, value, i);
      } else {
        await i.update({
          embeds: [
            new EmbedBuilder()
              .setTitle(`Transfer to ${p2.displayName}`)
              .setColor("DarkRed")
              .setDescription(`Transfer cancelled.`),
          ],
          components: [],
        });
      }

      collector.stop();
    });

    collector.on("end", async (_, reason) => {
      if (reason === "time") {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle(`Transfer to ${p2.displayName}`)
              .setColor("DarkRed")
              .setDescription(`Transfer expired.`),
          ],
          components: [],
        });
      }
    });
  }
}
