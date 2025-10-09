import { CommandContext } from "@types-local/commands";
import { isVoteEmoji, EmojiEnum } from "@utils";
import {
  Guild,
  GuildMember,
  InteractionCallbackResponse,
  Message,
  MessageReaction,
  ReactionCollector,
  User,
} from "discord.js";

type VoteContext<TTarget> = {
  reaction: MessageReaction;
  reactor: User;
  target: TTarget;
  response: InteractionCallbackResponse;
  reactionCollector: ReactionCollector;
} & Required<CommandContext>;

export abstract class VoteSubCommand<TTarget, TAction extends string> {
  protected _target: TTarget;
  protected _action: TAction;
  constructor(action: TAction, target: TTarget) {
    this._target = target;
    this._action = action;
  }

  protected _getPrompt(): string {
    return `Vote to ${this._action} ${this._target}?`;
  }

  protected _getSuccessMsg(forVotes: number, againstVotes?: number): string {
    return `Vote to ${this._action} member ${this._target} passed with ${forVotes} user(s) for the motion.`;
  }

  protected _getFailureMsg(againstVotes: number, forVotes?: number): string {
    return `Vote to ${this._action} member ${this._target} failed with ${againstVotes} user(s) against the motion.`;
  }

  protected async _logFailure(target: TTarget, guild: Guild): Promise<void> {
    console.log(`Vote against target ${target} failed!`);
  }

  protected async _collectHandler(
    voteCtx: VoteContext<TTarget>
  ): Promise<undefined> {
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
    this._printStatus(target, reactor, total, type, true);

    // check votes
    if (total >= actionThreshold) {
      if (reaction.emoji.name === EmojiEnum.EMOJI_AYE) {
      } else if (reaction.emoji.name === EmojiEnum.EMOJI_NAY) {
        await this._logFailure(this._target, interaction.guild);
        interaction
          .editReply(this._getFailureMsg(total))
          .catch((e) => console.error(e));
      }
      reactionCollector.stop();
    }
  }

  abstract prepareContext(ctx: CommandContext): Promise<void> | void;

  abstract execute(target: TTarget): Promise<void> | void;

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

  async startVote({
    response,
    ...ctx
  }: {
    response: InteractionCallbackResponse<boolean>;
  } & Required<CommandContext>) {
    if (!response.resource?.message)
      throw new Error("Unable to find response to interaction.");
    await response.resource.message.react(EmojiEnum.EMOJI_AYE);
    await response.resource.message.react(EmojiEnum.EMOJI_NAY);

    const filter = (reaction: MessageReaction, user: User) =>
      isVoteEmoji(reaction.emoji.name) && !user.bot;

    const reactionCollector = response.resource.message.createReactionCollector(
      {
        filter: filter,
        time: 30000,
        dispose: true,
      }
    );

    const voteCtxBase = {
      target: this._target,
      reactionCollector,
      response,
      ...ctx,
    };

    reactionCollector.on("collect", (reaction: MessageReaction, user: User) => {
      const voteCtx: VoteContext<TTarget> = {
        reactor: user,
        reaction,
        ...voteCtxBase,
      };
      collectHandler(this, voteCtx);
    });
  }
}

function removeHandler(voteCtx: VoteContext): void {
  const { reaction, user, target } = voteCtx;
  if (!isVoteEmoji(reaction.emoji.name)) return;
  const type: EmojiEnum = reaction.emoji.name;
  const total = getVoteTotal(reaction, target);
  printStatus(target, user, total, type, true);
}
