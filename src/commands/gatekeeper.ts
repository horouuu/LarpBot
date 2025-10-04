import { messageHandler } from "@handlers/message-handler";
import {
  Command,
  CommandContext,
  CommandContextRequire,
} from "@types-local/commands";
import { EmojiEnum } from "@types-local/util";
import { catchAllInteractionReply, isVoteEmoji } from "@utils";
import {
  ChannelType,
  DiscordAPIError,
  Message,
  MessageReaction,
  MessageType,
  ReactionCollector,
  SlashCommandBuilder,
  TextChannel,
  User,
} from "discord.js";

enum GatekeeperEnum {
  GK_CMD_NAME = "gatekeeper",
  REGISTER = "register",
  DELIST = "delist",
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
      .setName(GatekeeperEnum.DELIST)
      .setDescription(
        "Delists this channel from gatekeeper. Optionally, a channel can be specified."
      )
      .addChannelOption((opt) =>
        opt
          .setName(GatekeeperEnum.CHANNEL)
          .setDescription("Specifies channel to be delisted from gatekeeper.")
          .setRequired(false)
      )
  );

async function registerChannelCollector(
  ctx: GatekeeperContext & { channel: TextChannel }
) {
  const { interaction, channel } = ctx;
  const collector = channel.createMessageCollector({
    filter: (msg) => msg.type === MessageType.UserJoin,
  });

  collector.on("collect", async (msg) => {
    try {
      await msg.react(EmojiEnum.EMOJI_AYE);
      await msg.react(EmojiEnum.EMOJI_NAY);

      const rCollector = msg.createReactionCollector({
        filter: (reaction) => isVoteEmoji(reaction),
      });

      rCollector.on("collect", () => null);
    } catch (e) {
      console.error(e);
    }
  });
}

async function handleCollect(
  ctx: GatekeeperContext & {
    collector: ReactionCollector;
    reaction: MessageReaction;
    user: User;
    guildId: string;
    channelId: string;
  }
) {
  const { interaction, storage, reaction, guildId, channelId, collector } = ctx;

  try {
    if (reaction.emoji.name === EmojiEnum.EMOJI_AYE) {
      await storage.chRegGatekeeper(guildId, channelId, true);
      // TODO: handle collectors
    } else {
      collector.stop();
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
    guildId: string;
    channelId: string;
  }
): Promise<void> {
  const { interaction, res, guildId, channelId } = ctx;
  if (res.watching === channelId) {
    await interaction.reply("Gatekeeper is already watching this channel!");
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
      handleCollect({ ...ctx, reaction, user, guildId, channelId, collector })
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

    const guildId = interaction.guildId;
    if (!guildId) throw new Error("Gatekeeper: couldn't fetch guildId");
    const channelId = channel.id;
    const res = await storage.chRegGatekeeper(guildId, channelId);
    if (!res.success) {
      await handleAlreadyWatching({ ...ctx, res, guildId, channelId });
    } else {
      // TODO: handle listeners
      await interaction.reply(
        `Successfully registered channel ${channel} to gatekeeper.`
      );
    }
  } catch (e) {
    if (e instanceof DiscordAPIError || e instanceof GatekeeperError) throw e;
    console.log((e as Error).message);
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
      case GatekeeperEnum.DELIST:
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
