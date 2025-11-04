import { promptConfirmationDialog } from "../lib/_cmd-utils.js";
import { CommandContext } from "@types-local/commands";
import {
  ButtonInteraction,
  CacheType,
  EmbedBuilder,
  MessageFlags,
  SlashCommandSubcommandBuilder,
  User,
} from "discord.js";
import { Util } from "oldschooljs";

export const buildTransferSubcommand = (opt: SlashCommandSubcommandBuilder) =>
  opt
    .setName("transfer")
    .setDescription("Transfer coins to another user.")
    .addUserOption((opt) =>
      opt
        .setName("recipient")
        .setDescription("User to transfer coins to.")
        .setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName("amount")
        .setDescription("Amount of coins to transfer.")
        .setRequired(true)
    );

async function executeTransfer(
  ctx: CommandContext,
  p1: User,
  p2: User,
  value: number,
  i: ButtonInteraction<CacheType>
) {
  const { storage } = ctx;
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

export async function transferCoins(ctx: CommandContext) {
  const { interaction, storage } = ctx;
  const p1 = interaction.user;
  const p2 = interaction.options.getUser("recipient");
  const amount = interaction.options.getString("amount");

  if (!p2)
    return await interaction.reply({
      content: "You must indicate a recipient to transfer coins to.",
      flags: [MessageFlags.Ephemeral],
    });
  if (!amount)
    return await interaction.reply({
      content: "You must indicate an amount to transfer.",
      flags: [MessageFlags.Ephemeral],
    });

  const value = Util.fromKMB(amount);
  if (value <= 0)
    return await interaction.reply({
      content: "You must indicate an amount above 0.",
      flags: [MessageFlags.Ephemeral],
    });

  const owned = await storage.getCoins(p1.id);
  if (owned < value || Number.isNaN(value) || !value) {
    return await interaction.reply({
      content: "You do not have enough coins for this transfer.",
      flags: [MessageFlags.Ephemeral],
    });
  } else {
    const handleConfirm = async (i: ButtonInteraction) =>
      await executeTransfer(ctx, p1, p2, value, i);

    const handleCancel = async (i: ButtonInteraction) =>
      await i.update({
        embeds: [
          new EmbedBuilder()
            .setTitle(`Transfer to ${p2.displayName}`)
            .setColor("DarkRed")
            .setDescription(`Transfer cancelled.`),
        ],
        components: [],
      });

    const handleIgnore = async (i: ButtonInteraction) =>
      await i.reply({
        content: "Only the issuer of the transfer can confirm or rescind it.",
        flags: [MessageFlags.Ephemeral],
      });

    const handleExpiry = async () =>
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle(`Transfer to ${p2.displayName}`)
            .setColor("DarkRed")
            .setDescription(`Transfer expired.`),
        ],
        components: [],
      });

    await promptConfirmationDialog(
      interaction,
      {
        handleConfirm,
        handleCancel,
        handleIgnore,
        handleExpiry,
      },
      {
        confirmButtonLabel: "Yes",
        cancelButtonLabel: "No",
        title: `Transfer to ${p2.displayName}`,
        prompt: `Are you sure you want to transfer ${value.toLocaleString()} coins to ${p2}?`,
        ephemeral: false,
      }
    );
  }
}
