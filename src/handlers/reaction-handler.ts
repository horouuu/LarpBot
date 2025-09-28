import { Config } from "@/config";
import {
  DiscordAPIError,
  MessageReaction,
  MessageType,
  PartialMessageReaction,
  PartialUser,
  User,
} from "discord.js";

export async function reactionHandler(
  reaction: MessageReaction | PartialMessageReaction,
  author: User | PartialUser,
  config: Config
) {
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (e) {
      console.error(e);
      return;
    }
  }

  if (
    reaction.message.guildId != config.targetGuildId ||
    reaction.message.channelId != config.targetChannelId ||
    reaction.message.type != MessageType.UserJoin
  )
    return;
  // check cache for "done" markers first
  const emojiName = reaction.emoji.name;
  const cache = reaction.message.reactions.cache;

  if (cache.has("🎉") || cache.has("👋")) return;

  const memberId = reaction.message.author?.id;
  if (!memberId) return;
  const member = await reaction.message.guild?.members.fetch(memberId);

  if (emojiName == "❌" || emojiName == "✅") {
    let count = reaction.count;
    if (reaction.users.cache.has(memberId) || author.id == memberId) count -= 1;
    if (count - 1 >= config.actionThreshold) {
      try {
        if (emojiName == "❌") {
          if (member?.bannable) member.ban({ reason: "Rejected by bot." });
          await reaction.message.react("👋");
        } else {
          if (!member) return;
          await member.roles.add(config.memberRoleId);
          await reaction.message.react("🎉");
        }
        return;
      } catch (e) {
        console.error(e);

        if (e instanceof DiscordAPIError && e.code == 50013) {
          try {
            reaction.message.reply(
              "I don't seem to have permissions to take action here. Please update my permissions and react to the vote again."
            );
          } catch (e) {
            console.error("Failed to follow up on error:\n", e);
          }
        }
      }
    }
  }
}
