import { CommandContext } from "@types-local/commands";
import { isVoteEmoji, EmojiEnum } from "@utils";
import {
  Guild,
  InteractionCallbackResponse,
  MessageReaction,
  ReactionCollector,
  User,
} from "discord.js";

export type VoteContext<TTarget> = {
  reaction: MessageReaction;
  reactor: User;
  target: TTarget;
  responseRef: InteractionCallbackResponse;
  reactionCollector: ReactionCollector;
} & Required<CommandContext>;

export type VoteExecutionContext<TTarget> = VoteContext<TTarget> & {
  total: number;
};
export abstract class VoteSubCommand<TTarget, TAction extends string> {
  protected _target: TTarget;
  protected _action: TAction;
  public constructor(target: TTarget, action: TAction) {
    this._target = target;
    this._action = action;
  }

  protected _getPrompt(): string {
    const formattedAction =
      this._action.toLowerCase().charAt(0).toUpperCase() +
      this._action.slice(1);
    return `${formattedAction} ${this._target}?`;
  }

  protected _getSuccessMsg(forVotes: number, againstVotes?: number): string {
    return `${EmojiEnum.EMOJI_AYE} Vote to ${this._action} member ${this._target} passed with ${forVotes} user(s) for the motion ${EmojiEnum.EMOJI_AYE}`;
  }

  protected _getFailureMsg(againstVotes: number, forVotes?: number): string {
    return `${EmojiEnum.EMOJI_NAY} Vote to ${this._action} member ${this._target} failed with ${againstVotes} user(s) against the motion ${EmojiEnum.EMOJI_NAY}`;
  }

  protected _getExpiryMessage() {
    return `Vote on ${this._target} expired.`;
  }

  protected async _logFailure(target: TTarget, guild: Guild): Promise<void> {
    console.log(`Vote against target ${target} failed!`);
  }

  protected async _logSuccess(target: TTarget, guild: Guild): Promise<void> {
    console.log(`Vote against target ${target} passed!`);
  }

  protected collectHandler = async (
    voteCtx: VoteContext<TTarget>
  ): Promise<undefined> => {
    const {
      interaction,
      storage,
      config,
      reactor,
      reaction,
      target,
      reactionCollector,
    } = voteCtx;
    if (!interaction.guild) throw new Error("Error retrieving guild.");
    const persistedConfigs = await storage.retrieveConfigs(
      interaction.guild.id
    );
    const actionThreshold =
      persistedConfigs.actionThreshold ?? config.actionThreshold;

    if (!isVoteEmoji(reaction.emoji.name)) return;
    const type: EmojiEnum = reaction.emoji.name;
    const total = this._getVoteTotal(reaction, target);
    this._printStatus(target, reactor, total, type, false);

    // check votes
    if (total >= actionThreshold) {
      if (reaction.emoji.name === EmojiEnum.EMOJI_AYE) {
        await this._execute({ ...voteCtx, total: total });
        await this._logSuccess(this._target, interaction.guild);
      } else if (reaction.emoji.name === EmojiEnum.EMOJI_NAY) {
        await this._logFailure(this._target, interaction.guild);
        interaction
          .editReply(this._getFailureMsg(total))
          .catch((e) => console.error(e));
      }
      reactionCollector.stop();
    }
  };

  protected removeHandler = (voteCtx: VoteContext<TTarget>): void => {
    const { reaction, reactor, target } = voteCtx;
    if (!isVoteEmoji(reaction.emoji.name)) return;
    const type: EmojiEnum = reaction.emoji.name;
    const total = this._getVoteTotal(reaction, target);
    this._printStatus(target, reactor, total, type, true);
  };

  protected abstract start: (
    ctx: Required<CommandContext> & {
      responseRef: InteractionCallbackResponse<boolean>;
    }
  ) => Promise<void>;

  protected abstract _prepareContext(ctx: CommandContext): Promise<void> | void;

  protected abstract _execute(
    ctx: VoteExecutionContext<TTarget>
  ): Promise<void> | void;

  protected abstract _getVoteTotal(
    reaction: MessageReaction,
    target: TTarget
  ): number;

  protected abstract _printStatus(
    target: TTarget,
    reactor: User,
    total: number,
    type: EmojiEnum,
    removed: boolean
  ): Promise<void> | void;

  protected async _startVote(
    ctx: {
      responseRef: InteractionCallbackResponse<boolean>;
    } & Required<CommandContext>
  ) {
    const { responseRef } = ctx;
    if (!responseRef.resource?.message)
      throw new Error("Unable to find response to interaction.");
    await responseRef.resource.message.react(EmojiEnum.EMOJI_AYE);
    await responseRef.resource.message.react(EmojiEnum.EMOJI_NAY);

    const filter = (reaction: MessageReaction, user: User) =>
      isVoteEmoji(reaction.emoji.name) && !user.bot;

    const reactionCollector =
      responseRef.resource.message.createReactionCollector({
        filter: filter,
        time: 30000,
        dispose: true,
      });

    const voteCtxBase = {
      target: this._target,
      reactionCollector,
      ...ctx,
    };

    reactionCollector.on("collect", (reaction: MessageReaction, user: User) => {
      const voteCtx: VoteContext<TTarget> = {
        reactor: user,
        reaction,
        ...voteCtxBase,
      };
      this.collectHandler(voteCtx);
    });

    reactionCollector.on("remove", (reaction: MessageReaction, user: User) => {
      const voteCtx: VoteContext<TTarget> = {
        reaction,
        reactor: user,
        ...voteCtxBase,
      };
      this.removeHandler(voteCtx);
    });

    reactionCollector.on("end", (_, reason: string) => {
      if (reason === "time") {
        if (!responseRef.resource?.message) return;
        responseRef.resource.message
          .reply(this._getExpiryMessage())
          .catch((e) => console.error(e));
      }
    });
  }
}
