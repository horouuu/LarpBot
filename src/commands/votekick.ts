import {
  CacheType,
  Interaction,
  ApplicationCommandOptionType,
  MessageReaction,
  User,
  GuildMember,
  InteractionCallbackResponse,
  Message,
  ReactionCollector,
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

async function kickMember(
  message: Message,
  user: User,
  member: GuildMember,
  total: number
): Promise<void> {
  try {
    if (member.kickable) {
      member.kick(`Votekicked by ${total} other user(s).`);
      console.log(
        `Successfully kicked member ${user.username} | ${member.id} ${
          member.nickname ? `(${member.nickname})` : `(${member.displayName})`
        } from guild ${member.guild.name} (${member.guild.id})`
      );
    } else {
      await message.reply("I don't have the permissions to kick that user!");
    }
  } catch (e) {
    console.error(e);
  }
}

function collectHandler(
  reaction: MessageReaction,
  user: User,
  member: GuildMember,
  target: User,
  response: InteractionCallbackResponse,
  reactionCollector: ReactionCollector
): Promise<void> {
  if (!isVoteEmoji(reaction.emoji.name)) return;
  const type: VoteEmojiType = reaction.emoji.name;
  const total = getVoteTotal(reaction, target);
  printStatus(target, user, total, type);

  // check votes
  if (total >= 1) {
    if (reaction.emoji.name === EMOJI_AYE) {
      kickMember(response.resource.message, target, member, total);
    } else if (reaction.emoji.name === EMOJI_NAY) {
      console.log(
        `Vote against member ${target.username} | ${member.id} ${
          member.nickname ? `(${member.nickname})` : `(${member.displayName})`
        } failed in guild ${member.guild.name} (${member.guild.id})`
      );
      response.resource.message
        .reply(`Vote failed with ${total} user(s) against the motion.`)
        .catch((e) => console.error(e));
    }
    reactionCollector.stop();
  }
}

function removeHandler(
  reaction: MessageReaction,
  user: User,
  target: User
): void {
  if (!isVoteEmoji(reaction.emoji.name)) return;
  const type: VoteEmojiType = reaction.emoji.name;
  const total = getVoteTotal(reaction, target);
  printStatus(target, user, total, type, true);
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

    try {
      // input check
      const target = interaction.options.getUser("target");
      if (!target) {
        await interaction.reply("Missing input: target.");
        return;
      }

      // member check
      const member = await interaction.guild.members.fetch(target.id);
      if (!member) {
        await interaction.reply("Member no longer in server.");
        return;
      } else if (!member.kickable) {
        await interaction.reply(
          "I don't have the permissions to kick that user!"
        );
        return;
      }

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

      reactionCollector.on("collect", (reaction: MessageReaction, user: User) =>
        collectHandler(
          reaction,
          user,
          member,
          target,
          response,
          reactionCollector
        )
      );

      reactionCollector.on("remove", (reaction: MessageReaction, user: User) =>
        removeHandler(reaction, user, target)
      );

      reactionCollector.on("end", (_, reason: string) => {
        if (reason === "time") {
          response.resource.message
            .reply(`Vote on member ${target} expired.`)
            .catch((e) => console.error(e));
        }
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
