import { GatekeeperContext } from "@commands/gatekeeper";
import { EmojiEnum } from "@types-local/util";
import { isVoteEmoji } from "@utils";

import {
  DiscordAPIError,
  MessageReaction,
  MessageType,
  PartialMessageReaction,
  PartialUser,
  ReactionCollector,
  TextChannel,
  User,
} from "discord.js";

export async function createGatekeeperCollectors(
  ctx: Omit<GatekeeperContext, "interaction"> & {
    channel: TextChannel;
  }
) {
  const { channel } = ctx;
  const collector = channel.createMessageCollector({
    filter: (msg) => msg.type === MessageType.UserJoin,
  });

  collector.on("collect", async (msg) => {
    try {
      await msg.react(EmojiEnum.EMOJI_AYE);
      await msg.react(EmojiEnum.EMOJI_NAY);

      const rCollector = msg.createReactionCollector({
        filter: (reaction) => isVoteEmoji(reaction.emoji.name),
      });

      rCollector.on("collect", (reaction, user) =>
        gatekeeperReactionHandler(reaction, user, rCollector, ctx)
      );
    } catch (e) {
      console.error(e);
    }
  });
}

export async function gatekeeperReactionHandler(
  reaction: MessageReaction | PartialMessageReaction,
  author: User | PartialUser,
  collector: ReactionCollector,
  ctx: Omit<GatekeeperContext, "interaction">
) {
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (e) {
      console.error(e);
      return;
    }
  }

  const { config, storage } = ctx;

  if (!reaction.message.author) return;
  if (reaction.message.author.id === reaction.client.user.id) return;

  const memberId = reaction.message.author.id;

  if (!reaction.message.guild) return;
  const member = await reaction.message.guild?.members.fetch(memberId);

  let count = reaction.count;
  if (!count) return;

  if (reaction.users.cache.has(memberId) || author.id == memberId) count -= 1;

  const actionThreshold =
    (await storage.retrieveConfigs(reaction.message.guild.id))
      .actionThreshold ?? config.actionThreshold;

  if (count - 1 >= actionThreshold) {
    try {
      const emojiName = reaction.emoji.name;
      if (emojiName == EmojiEnum.EMOJI_NAY) {
        if (member?.bannable) member.ban({ reason: "Rejected by bot." });
        await reaction.message.react(EmojiEnum.EMOJI_BYE);
      } else {
        if (!member) return;
        await member.roles.add(config.memberRoleId);
        await reaction.message.react(EmojiEnum.EMOJI_WELCOME);
      }
      collector.stop();
    } catch (e) {
      console.error(e);
      try {
        if (e instanceof DiscordAPIError && e.code == 50013) {
          await reaction.message.reply(
            "I don't seem to have permissions to take action here. Please update my permissions and react to the vote again."
          );
        } else {
          await reaction.message.reply(
            "Something went wrong on the backend. Contact the developer for help."
          );
        }
      } catch (e) {
        console.error(`[gatekeeper-reactions]: ${e}`);
      }
    }
  }
}
