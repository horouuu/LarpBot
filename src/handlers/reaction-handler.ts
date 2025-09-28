import { Config } from "@/config";
import {
  MessageReaction,
  MessageType,
  PartialMessageReaction,
} from "discord.js";

export async function reactionHandler(
  reaction: MessageReaction | PartialMessageReaction,
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

  if ((emojiName == "❌" || emojiName == "✅") && cache.has(emojiName)) {
    const count = cache.get(emojiName)?.count ?? 0;
    if (count - 1 >= config.actionThreshold) {
      if (emojiName == "❌") {
        await reaction.message.react("👋");
        if (member?.bannable) member.ban({ reason: "Rejected by bot." });
      } else {
        await reaction.message.react("🎉");
        try {
          if (!member) return;
          await member.roles.add(config.memberRoleId);
        } catch (e) {
          console.error(e);
        }
      }
      return;
    }
  }
}
