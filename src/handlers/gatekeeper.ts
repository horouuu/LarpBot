import { GatekeeperContext } from "@commands/gatekeeper";
import { HandlerContext } from "@types-local/global";
import { EmojiEnum } from "@types-local/util";
import { catchAllInteractionReply } from "@utils";
import {
  DiscordAPIError,
  MessageReaction,
  PartialMessageReaction,
  PartialUser,
  ReactionCollector,
  User,
} from "discord.js";

export async function gatekeeperReactionHandler(
  reaction: MessageReaction | PartialMessageReaction,
  author: User | PartialUser,
  collector: ReactionCollector,
  ctx: GatekeeperContext
) {
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (e) {
      console.error(e);
      return;
    }
  }

  const { interaction, config, storage } = ctx;

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
      if (e instanceof DiscordAPIError && e.code == 50013) {
        reaction.message
          .reply(
            "I don't seem to have permissions to take action here. Please update my permissions and react to the vote again."
          )
          .catch((e) => console.error(e));
      }

      catchAllInteractionReply(interaction);
    }
  }
}
