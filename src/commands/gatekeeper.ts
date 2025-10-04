import { createGatekeeperCollectors } from "@handlers/gatekeeper/gatekeeper-reactions.js";
import {
  Command,
  CommandContext,
  CommandContextRequire,
} from "@types-local/commands";
import { catchAllInteractionReply, isVoteEmoji, EmojiEnum } from "@utils";
import {
  ChannelType,
  DiscordAPIError,
  Guild,
  MessageReaction,
  ReactionCollector,
  SlashCommandBuilder,
  TextChannel,
  User,
} from "discord.js";

enum GatekeeperEnum {
  GK_CMD_NAME = "gatekeeper",
  REGISTER = "register",
  DELIST = "delist",
  VIEW = "view",
  CHANNEL = "channel",
}

class GatekeeperError extends Error {}

export type GatekeeperContext = CommandContextRequire<
  CommandContext,
  "storage" | "config"
>;

const gatekeeperData = new SlashCommandBuilder()
  .setName(GatekeeperEnum.GK_CMD_NAME)
  .setDescription("Configures gatekeeper for this server.")
  .addSubcommand((opt) =>
    opt
      .setName(GatekeeperEnum.REGISTER)
      .setDescription(
        "Registers this channel to gatekeeper. Optionally, a channel can be specified."
      )
      .addChannelOption((opt) =>
        opt
          .setName(GatekeeperEnum.CHANNEL)
          .setDescription("Specifies channel to be watched by gatekeeper.")
          .setRequired(false)
      )
  )
  .addSubcommand((opt) =>
    opt
      .setName(GatekeeperEnum.VIEW)
      .setDescription("Returns channel currently being watched by gatekeeper.")
  )
  .addSubcommand((opt) =>
    opt
      .setName(GatekeeperEnum.DELIST)
      .setDescription(
        "Delists this channel from gatekeeper. Optionally, a channel can be specified."
      )
  );

async function handleConfirmOverwrite(
  ctx: GatekeeperContext & {
    collector: ReactionCollector;
    reaction: MessageReaction;
    user: User;
    guild: Guild;
    channel: TextChannel;
  }
) {
  const { interaction, storage, reaction, guild, channel, collector } = ctx;
  try {
    collector.stop();
    if (reaction.emoji.name === EmojiEnum.EMOJI_AYE) {
      await storage.chRegGatekeeper(guild.id, channel.id, true);
      await createGatekeeperCollectors({ ...ctx, channel });
      await interaction.followUp(
        `Successfully registered ${channel} to gatekeeper.`
      );
    } else {
      await interaction.followUp("Gatekeeper registration cancelled.");
    }
  } catch (e) {
    console.error(e);
    catchAllInteractionReply(interaction);
  }
}

async function handleAlreadyWatching(
  ctx: GatekeeperContext & {
    res: { success: boolean; watching: string };
    guild: Guild;
    channel: TextChannel;
  }
): Promise<void> {
  const { interaction, res, guild, channel } = ctx;
  if (res.watching === channel.id) {
    await interaction.reply(
      `Gatekeeper is already watching channel ${channel}!`
    );
    throw new Error("Gatekeeper: Channel already registered");
  } else {
    const watchingChannel = await interaction.guild?.channels.fetch(
      res.watching
    );

    const reply = await interaction.reply({
      content: `Gatekeeper is currently watching: ${watchingChannel}!\nDo you want to overwrite this?`,
      withResponse: true,
    });

    const message = reply.resource?.message;
    if (!message)
      throw new GatekeeperError(
        "Gatekeeper: Unable to find message to attach collector to."
      );

    await message.react(`${EmojiEnum.EMOJI_AYE}`);
    await message.react(`${EmojiEnum.EMOJI_NAY}`);

    const collector = message.createReactionCollector({
      filter: (reaction, user) =>
        user === interaction.user && isVoteEmoji(reaction.emoji.name),
      time: 30000,
    });
    collector.on("collect", (reaction, user) =>
      handleConfirmOverwrite({
        ...ctx,
        reaction,
        user,
        guild,
        channel,
        collector,
      })
    );
  }
}

async function handleRegister(ctx: GatekeeperContext): Promise<void> {
  const { interaction, storage } = ctx;
  try {
    const currentChannel = interaction.channel;
    let channel = interaction.options.getChannel<ChannelType.GuildText>(
      GatekeeperEnum.CHANNEL
    );
    if (!channel) {
      if (!currentChannel) {
        await interaction.reply(
          "I couldn't detect a valid channel and none were received through input!"
        );
        throw new Error("Gatekeeper: No valid channels detected");
      } else if (currentChannel.type !== ChannelType.GuildText) {
        await interaction.reply(
          "Gatekeeper only works in server-based text channels!"
        );
        throw new Error("Gatekeeper: Invalid channel");
      }

      channel = currentChannel;
    }

    const guild = interaction.guild;
    if (!guild) throw new Error("Gatekeeper: couldn't fetch guildId");

    const channelId = channel.id;
    const res = await storage.chRegGatekeeper(guild.id, channelId);
    if (!res.success) {
      await handleAlreadyWatching({ ...ctx, res, guild, channel });
    } else {
      await createGatekeeperCollectors({ ...ctx, channel });
      await interaction.reply(
        `Successfully registered ${channel} to gatekeeper.`
      );
    }
  } catch (e) {
    if (e instanceof DiscordAPIError || e instanceof GatekeeperError) throw e;
    console.log((e as Error).message);
  }
}

async function handleView(ctx: GatekeeperContext) {
  const { interaction, storage } = ctx;
  const guild = interaction.guild;
  if (!guild) throw new Error("Gatekeeper: couldn't fetch guild");
  const watchedChannelId = await storage.chGetGatekeeper(guild.id);
  if (!watchedChannelId) {
    await interaction.reply(
      "Gatekeeper is not currently watching any channel in this server."
    );
  } else {
    const channel = await guild.channels.fetch(watchedChannelId);
    await interaction.reply(
      `Gatekeeper is currently watching channel ${channel} in server **${guild}**.`
    );
  }
}

async function handleDelist(ctx: GatekeeperContext) {
  const { interaction, storage } = ctx;
  const guild = interaction.guild;
  if (!guild) throw new Error("Gatekeeper: couldn't fetch guild");
  const res = await storage.chDelGatekeeper(guild.id);
  if (!res.success) {
    await interaction.reply(
      "Gatekeeper is not currently watching any channel in this server!"
    );
  } else {
    await interaction.reply(
      `Successfully delisted channel <#${res.delisted}> from gatekeeper.`
    );
  }
}

async function execute(commandCtx: GatekeeperContext): Promise<void> {
  const { interaction } = commandCtx;
  if (!interaction.isChatInputCommand()) return;
  const sc = interaction.options.getSubcommand();

  try {
    switch (sc) {
      case GatekeeperEnum.REGISTER:
        await handleRegister(commandCtx);
        break;
      case GatekeeperEnum.VIEW:
        await handleView(commandCtx);
        break;
      case GatekeeperEnum.DELIST:
        await handleDelist(commandCtx);
        break;
    }
  } catch (e) {
    console.error(e);
    catchAllInteractionReply(interaction);
  }
}

const gatekeeper = {
  ...gatekeeperData.toJSON(),
  execute,
} satisfies Command;

export { gatekeeper };
