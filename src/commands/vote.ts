import {
  CacheType,
  MessageReaction,
  User,
  GuildMember,
  InteractionCallbackResponse,
  Message,
  ReactionCollector,
  DiscordAPIError,
  RESTJSONErrorCodes,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import {
  Command,
  CommandContext,
  CommandContextRequire,
} from "@types-local/commands";
import { ConfigType } from "@config";
import { catchAllInteractionReply, isVoteEmoji, EmojiEnum } from "@utils";
import { Storage } from "@storage";
import { VoteSubCommand } from "./vote/Vote";

type VoteContext = {
  reaction: MessageReaction;
  user: User;
  member: GuildMember;
  target: User;
  storage: Storage;
  config: ConfigType;
  response: InteractionCallbackResponse;
  reactionCollector: ReactionCollector;
  interaction?: ChatInputCommandInteraction<CacheType>;
};

enum VoteEnum {
  VOTE_KICK = "kick",
}

type KickContext = {
  message: Message | null;
  user: User;
  member: GuildMember;
  total: number;
  interaction: ChatInputCommandInteraction<CacheType>;
  ban: boolean;
};

const votekickData = new SlashCommandBuilder()
  .setName("vote")
  .setDescription("Starts a vote.")
  .addSubcommand((opt) =>
    opt
      .setName("kick")
      .setDescription("Starts a vote to kick a member.")
      .addUserOption((opt) =>
        opt
          .setName("target")
          .setDescription("Target of the vote.")
          .setRequired(true)
      )
      .addBooleanOption((opt) =>
        opt
          .setName("ban")
          .setDescription("Changes the result of the vote into a ban.")
          .setRequired(false)
      )
  );

const votekick = {
  ...votekickData.toJSON(),
  execute: async (
    commandCtx: CommandContextRequire<CommandContext, "config" | "storage">
  ) => {
    const { interaction, config, storage } = commandCtx;
    if (!interaction.isChatInputCommand()) return;
    const response = await interaction.deferReply({ withResponse: true });
    const cmd = interaction.options.getSubcommand();
    try {
      switch (cmd) {
        case VoteEnum.VOTE_KICK:
          break;
        default:
          throw new Error("Invalid subcommand.");
      }

      if (!response.resource?.message)
        throw new Error("Unable to find response to interaction.");
      await response.resource.message.react(EmojiEnum.EMOJI_AYE);
      await response.resource.message.react(EmojiEnum.EMOJI_NAY);

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
        storage,
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
