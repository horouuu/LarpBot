import { CommandContext } from "@types-local/commands";
import { VoteExecutionContext, VoteSubCommand } from "./Vote";
import {
  Guild,
  InteractionCallbackResponse,
  MessageReaction,
  User,
} from "discord.js";
import { EmojiEnum } from "@utils";

export class Votekick extends VoteSubCommand<User, "kick" | "ban"> {
  constructor(target: User, ban: boolean = false) {
    const act = ban ? "ban" : "kick";
    super(target, act);
  }

  public start = async (
    ctx: Required<CommandContext> & {
      responseRef: InteractionCallbackResponse<boolean>;
    }
  ) => {
    await this._prepareContext(ctx);
  };

  protected async _prepareContext(
    ctx: Required<CommandContext> & {
      responseRef: InteractionCallbackResponse<boolean>;
    }
  ) {
    const { interaction } = ctx;
    const target = interaction.options.getUser("target");
    if (!target) {
      await interaction.editReply("Missing input: target.");
      return;
    }

    if (!interaction.guild) {
      await interaction.editReply("Unable to find guild of interaction.");
      return;
    }

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
    this._action = ban ? "ban" : "kick";

    await interaction.editReply(this._getPrompt());
    await this._startVote(ctx);
  }

  protected async _execute(ctx: VoteExecutionContext<User>): Promise<void> {
    const { total, interaction, responseRef } = ctx;
    try {
      const user = this._target;
      const member = await interaction.guild?.members.fetch(user.id);
      const ban = this._action === "ban";
      const condition = ban ? member?.bannable : member?.kickable;

      if (condition) {
        if (ban) {
          await member?.ban({
            reason: `Vote-banned by ${total} other user(s)`,
          });
        } else {
          await member?.kick(`Vote-kicked by ${total} other user(s)`);
        }

        console.log(
          `Successfully ${ban ? "banned" : "kicked"} member ${
            user.username
          } | ${member?.id} ${
            member?.nickname
              ? `(${member?.nickname})`
              : `(${member?.displayName})`
          } from guild ${member?.guild.name} (${member?.guild.id})`
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
        await responseRef.resource?.message?.reply(
          `I don't have the permissions to ${ban ? "ban" : "kick"} that user!`
        );
      }
    } catch (e) {
      console.error(e);
    }
  }

  protected override _getVoteTotal(
    reaction: MessageReaction,
    target: User
  ): number {
    const targetInVote = reaction.users.cache.has(target.id) ? 1 : 0;
    const botsInVote = reaction.users.cache.filter(
      (user: User) => user.bot
    ).size;
    const total = reaction.count - targetInVote - botsInVote; // deduct all bots and target's votes
    return total;
  }

  protected override async _logFailure(target: User, guild: Guild) {
    const member = await guild.members.fetch(target.id);
    console.log(
      `Vote against member ${target.username} | ${member.id} ${
        member.nickname ? `(${member.nickname})` : `(${member.displayName})`
      } failed in guild ${member.guild.name} (${member.guild.id})`
    );
  }

  protected override _printStatus(
    target: User,
    reactor: User,
    total: number,
    type: EmojiEnum,
    removed: boolean = false
  ): void {
    console.log(
      `Vote against ${target.username} | ${type}: ${total} (${
        target.id === reactor.id
          ? "<>"
          : reactor.bot
          ? "!!"
          : removed
          ? "-"
          : "+"
      } ${reactor.username})`
    );
  }
}

export {};
