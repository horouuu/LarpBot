import { CommandContext } from "@types-local/commands";
import { VoteSubCommand } from "./Vote";
import { MessageReaction, User } from "discord.js";

export class Votekick extends VoteSubCommand<User, "kick" | "ban"> {
  async prepareContext(ctx: CommandContext) {
    const { interaction } = ctx;
    const target = interaction.options.getUser("target");
    if (!target) throw new Error("Missing input: target.");

    if (!interaction.guild)
      throw new Error("Unable to find guild of interaction.");
    const member = await interaction.guild.members.fetch(target.id);
    if (!member) {
      throw new Error("Member no longer in server.");
    } else if (!member.kickable) {
      throw new Error("I don't have the permissions to kick that user!");
    }

    const ban = interaction.options.getBoolean("ban");
    this._action = ban ? "ban" : "kick";
  }

  override async execute(kickCtx: KickContext): Promise<void> {
    const { member, total, interaction, message } = kickCtx;
    try {
      const user = this._target;
      const ban = this._action === "ban";
      const condition = ban ? member.bannable : member.kickable;
      if (condition) {
        if (ban) {
          await member.ban({ reason: `Vote-banned by ${total} other user(s)` });
        } else {
          await member.kick(`Vote-kicked by ${total} other user(s)`);
        }

        console.log(
          `Successfully ${ban ? "banned" : "kicked"} member ${
            user.username
          } | ${member.id} ${
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
  override getVoteTotal(reaction: MessageReaction, target: User): number {
    const targetInVote = reaction.users.cache.has(target.id) ? 1 : 0;
    const botsInVote = reaction.users.cache.filter(
      (user: User) => user.bot
    ).size;
    const total = reaction.count - targetInVote - botsInVote; // deduct all bots and target's votes
    return total;
  }
}

export {};
