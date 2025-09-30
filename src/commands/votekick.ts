import {
  CacheType,
  Interaction,
  ApplicationCommandOptionType,
  MessageReaction,
  User,
} from "discord.js";
import { Command } from "@types-local/commands";

type VoteEmojiType = "❌" | "✅";
const EMOJI_AYE: VoteEmojiType = "✅";
const EMOJI_NAY: VoteEmojiType = "❌";

function printStatus(
  target: User,
  user: User,
  total: number,
  type: VoteEmojiType,
  removed: boolean = false
): void {
  console.log(
    `Vote against ${target.username} | ${type}: ${total} (${
      target.id === user.id ? "<>" : user.bot ? "!!" : removed ? "-" : "+"
    } ${user.username})`
  );
}

function getVoteTotal(reaction: MessageReaction, target: User): number {
  const targetInVote = reaction.users.cache.has(target.id) ? 1 : 0;
  const botsInVote = reaction.users.cache.filter((user: User) => user.bot).size;
  const total = reaction.count - targetInVote - botsInVote; // deduct all bots and target's votes
  return total;
}

function isVoteEmoji(str: any): str is VoteEmojiType {
  return str === EMOJI_AYE || str === EMOJI_NAY;
}

const votekick = {
  name: "votekick",
  description:
    "Starts a vote to kick a member. Requires 3 votes excluding the bot by default.",
  options: [
    {
      type: ApplicationCommandOptionType.User,
      name: "target",
      description: "Votekick target",
      required: true,
    },
  ],
  execute: async (interaction: Interaction<CacheType>) => {
    if (!interaction.isChatInputCommand()) return;
    const target = interaction.options.getUser("target");
    if (!target) {
      await interaction.reply("Missing input: target.");
      return;
    }

    try {
      const response = await interaction.reply({
        content: `Vote to kick member: ${target}?`,
        withResponse: true,
      });

      await response.resource.message.react(EMOJI_AYE);
      await response.resource.message.react(EMOJI_NAY);

      const filter = (reaction: MessageReaction, user: User) =>
        isVoteEmoji(reaction.emoji.name) && !user.bot;

      const reactionCollector =
        response.resource.message.createReactionCollector({
          filter: filter,
          time: 30000,
          dispose: true,
        });

      reactionCollector.on(
        "collect",
        (reaction: MessageReaction, user: User) => {
          if (!isVoteEmoji(reaction.emoji.name)) return;
          const type: VoteEmojiType = reaction.emoji.name;
          const total = getVoteTotal(reaction, target);
          printStatus(target, user, total, type);
        }
      );

      reactionCollector.on(
        "remove",
        (reaction: MessageReaction, user: User) => {
          if (!isVoteEmoji(reaction.emoji.name)) return;
          const type: VoteEmojiType = reaction.emoji.name;
          const total = getVoteTotal(reaction, target);
          printStatus(target, user, total, type, true);
        }
      );

      reactionCollector.on("dispose", (_, user: User) => {
        console.log(
          `Vote against ${target.username} forcibly ended by moderator: ${user.username} (${user.id}).`
        );
      });

      reactionCollector.on("end", () => {
        response.resource.message
          .reply(`Vote on member ${target} expired.`)
          .catch((e) => console.error(e));
      });
    } catch (e) {
      console.error(e);
      interaction
        .followUp(
          "Something went wrong in the background. Contact the developers for help."
        )
        .catch((e) => console.error(e));
    }
  },
} satisfies Command;

export { votekick };
