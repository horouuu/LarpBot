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
  DiscordAPIError,
  RESTJSONErrorCodes,
  ChatInputCommandInteraction,
} from "discord.js";
import {
  Command,
  CommandContext,
  CommandContextRequire,
} from "@types-local/commands";
import { ConfigType } from "@config";
import { catchAllInteractionReply } from "@utils";

type VoteEmojiType = "❌" | "✅";
const EMOJI_AYE: VoteEmojiType = "✅";
const EMOJI_NAY: VoteEmojiType = "❌";

type VoteContext = {
  reaction: MessageReaction;
  user: User;
  member: GuildMember;
  target: User;
  config: ConfigType;
  response: InteractionCallbackResponse;
  reactionCollector: ReactionCollector;
  interaction?: ChatInputCommandInteraction<CacheType>;
};

type KickContext = {
  message: Message | null;
  user: User;
  member: GuildMember;
  total: number;
  interaction: ChatInputCommandInteraction<CacheType>;
  ban: boolean;
};

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

async function kickMember(kickCtx: KickContext): Promise<void> {
  const { member, ban, user, total, interaction, message } = kickCtx;
  try {
    const condition = ban ? member.bannable : member.kickable;
    if (condition) {
      if (ban) {
        await member.ban({ reason: `Vote-banned by ${total} other user(s)` });
      } else {
        await member.kick(`Vote-kicked by ${total} other user(s)`);
      }

      console.log(
        `Successfully ${ban ? "banned" : "kicked"} member ${user.username} | ${
          member.id
        } ${
          member.nickname ? `(${member.nickname})` : `(${member.displayName})`
        } from guild ${member.guild.name} (${member.guild.id})`
      );

      const msg = `Vote to ${
        ban ? "ban" : "kick"
      } ${user} passed with ${total} user(s) for the motion.`;
      if (interaction.deferred) {
        await interaction.editReply(msg);
      } else if (interaction.isRepliable()) {
        await interaction.reply(msg);
      }
    } else {
      await message?.reply(
        `I don't have the permissions to ${ban ? "ban" : "kick"} that user!`
      );
    }
  } catch (e) {
    console.error(e);
  }
}

async function collectHandler(
  voteCtx: Required<VoteContext>
): Promise<undefined> {
  const {
    reaction,
    user,
    member,
    target,
    config,
    response,
    reactionCollector,
    interaction,
  } = voteCtx;
  const actionThreshold = config.actionThreshold;

  if (!isVoteEmoji(reaction.emoji.name)) return;
  const type: VoteEmojiType = reaction.emoji.name;
  const total = getVoteTotal(reaction, target);
  const ban = interaction.options.getBoolean("ban");
  printStatus(target, user, total, type);

  // check votes
  if (total >= actionThreshold) {
    if (reaction.emoji.name === EMOJI_AYE) {
      kickMember({
        message: response.resource?.message ?? null,
        user: target,
        member,
        total,
        interaction,
        ban: ban ?? false,
      });
    } else if (reaction.emoji.name === EMOJI_NAY) {
      console.log(
        `Vote against member ${target.username} | ${member.id} ${
          member.nickname ? `(${member.nickname})` : `(${member.displayName})`
        } failed in guild ${member.guild.name} (${member.guild.id})`
      );
      interaction
        .editReply(
          `Vote to ${
            ban ? "ban" : "kick"
          } ${target} failed with ${total} user(s) against the motion.`
        )
        .catch((e) => console.error(e));
    }
    reactionCollector.stop();
  }
}

function removeHandler(voteCtx: VoteContext): void {
  const { reaction, user, target } = voteCtx;
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
    {
      type: ApplicationCommandOptionType.Boolean,
      name: "ban",
      description: "Bans the target instead of kicking them.",
      required: false,
    },
  ],
  execute: async (
    commandCtx: CommandContextRequire<CommandContext, "config">
  ) => {
    const { interaction, config } = commandCtx;
    if (!interaction.isChatInputCommand()) return;
    if (!config) throw new Error("Config missing for command: Votekick");
    const response = await interaction.deferReply({ withResponse: true });

    try {
      // input check
      const target = interaction.options.getUser("target");
      if (!target) {
        await interaction.editReply("Missing input: target.");
        return;
      }

      // member check
      if (!interaction.guild)
        throw new Error("Unable to find guild of interaction.");
      const member = await interaction.guild.members.fetch(target.id);
      if (!member) {
        await interaction.editReply("Member no longer in server.");
        return;
      } else if (!member.kickable) {
        await interaction.editReply(
          "I don't have the permissions to kick that user!"
        );
        return;
      }
      const ban = interaction.options.getBoolean("ban");
      await interaction.editReply({
        content: `Vote to ${ban ? "ban" : "kick"} member: ${target}?`,
      });

      if (!response.resource?.message)
        throw new Error("Unable to find response to interaction.");
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

      const voteCtxBase = {
        member,
        target,
        config,
        response,
        reactionCollector,
      };

      reactionCollector.on(
        "collect",
        (reaction: MessageReaction, user: User) => {
          const voteCtx: Required<VoteContext> = {
            reaction,
            user,
            interaction,
            ...voteCtxBase,
          };
          collectHandler(voteCtx);
        }
      );

      reactionCollector.on(
        "remove",
        (reaction: MessageReaction, user: User) => {
          const voteCtx: VoteContext = { reaction, user, ...voteCtxBase };
          removeHandler(voteCtx);
        }
      );

      reactionCollector.on("end", (_, reason: string) => {
        if (reason === "time") {
          if (!response.resource?.message) return;
          response.resource.message
            .reply(`Vote on member ${target} expired.`)
            .catch((e) => console.error(e));
        }
      });
    } catch (e) {
      let errMsg = "";
      if (
        e instanceof DiscordAPIError &&
        e.code == RESTJSONErrorCodes.UnknownMember
      ) {
        errMsg = "That member isn't in the server.";
      }
      catchAllInteractionReply(interaction, errMsg);
    }
  },
} satisfies Command;

export { votekick };
