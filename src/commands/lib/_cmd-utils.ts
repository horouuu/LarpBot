import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonComponent,
  ButtonInteraction,
  ButtonStyle,
  CacheType,
  ChatInputCommandInteraction,
  ComponentType,
  EmbedBuilder,
  InteractionCallbackResponse,
  InteractionReplyOptions,
  Message,
  MessageFlags,
} from "discord.js";

type ConfirmationDialogOpts = {
  confirmButtonLabel?: string;
  cancelButtonLabel?: string;
  prompt?: string;
  title?: string;
  ephemeral?: boolean;
  expiryMs?: number;
};

type ConfirmationDialogHandlers = {
  handleConfirm?: (i: ButtonInteraction<CacheType>) => Promise<any>;
  handleCancel?: (i: ButtonInteraction<CacheType>) => Promise<any>;
  handleExpiry?: () => Promise<any>;
};

export async function promptConfirmationDialog(
  interaction: ChatInputCommandInteraction<CacheType>,
  {
    handleConfirm,
    handleCancel,
    handleExpiry,
  }: ConfirmationDialogHandlers = {},
  {
    confirmButtonLabel = "Confirm",
    cancelButtonLabel = "Cancel",
    prompt = "Are you sure you wish to do this?",
    title = "Confirmation",
    ephemeral = true,
    expiryMs = 15000,
  }: ConfirmationDialogOpts = {}
) {
  if (!handleConfirm)
    handleConfirm = async (i) =>
      await i.update({
        embeds: [
          new EmbedBuilder()
            .setTitle(title)
            .setDescription("Success!")
            .setColor("DarkGreen"),
        ],
        components: [],
      });

  if (!handleCancel)
    handleCancel = async (i) =>
      await i.update({
        embeds: [
          new EmbedBuilder()
            .setTitle(title)
            .setDescription("Cancelled.")
            .setColor("DarkRed"),
        ],
        components: [],
      });

  if (!handleExpiry)
    handleExpiry = async () => {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle(title)
            .setDescription("Confirmation expired.")
            .setColor("DarkRed"),
        ],
        components: [],
      });
    };

  const content: InteractionReplyOptions & { withResponse: true } = {
    embeds: [
      new EmbedBuilder()
        .setTitle(title)
        .setDescription(prompt)
        .setColor("DarkRed"),
    ],
    components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("confirm")
          .setLabel(confirmButtonLabel)
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId("cancel")
          .setLabel(cancelButtonLabel)
          .setStyle(ButtonStyle.Secondary)
      ),
    ],
    flags: [],
    withResponse: true,
  };

  if (ephemeral) content.flags = MessageFlags.Ephemeral;
  const res: InteractionCallbackResponse = await interaction.reply(content);
  const msg = res.resource?.message;
  if (!msg) throw new Error("Can't find response msg.");

  const collector = msg.createMessageComponentCollector({
    filter: (i) => i.user.id === interaction.user.id,
    time: expiryMs,
    componentType: ComponentType.Button,
  });

  collector.on("collect", async (i) => {
    if (i.customId === "confirm") {
      await handleConfirm(i);
    } else {
      await handleCancel(i);
    }

    collector.stop();
  });

  collector.on("end", async (_, reason) => {
    if (reason === "time") {
      await handleExpiry();
    }
  });

  if (!ephemeral)
    collector.on("ignore", async (i) => {
      await i.reply("Only the sender of an interaction can confirm it!");
    });
}
