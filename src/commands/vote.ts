import {
  DiscordAPIError,
  RESTJSONErrorCodes,
  SlashCommandBuilder,
} from "discord.js";
import {
  Command,
  CommandContext,
  CommandContextRequire,
} from "@types-local/commands";

import { catchAllInteractionReply } from "@utils";
import { Votekick } from "./vote/Votekick";

enum VoteEnum {
  VOTE_KICK = "kick",
}

const voteData = new SlashCommandBuilder()
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

const vote = {
  ...voteData.toJSON(),
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
          const target = interaction.options.getUser("target");
          const ban = interaction.options.getBoolean("ban") ?? false;
          if (!target) throw new Error("Please specify a target.");

          const vkInstance = new Votekick(target, ban);
          await vkInstance.start({ ...commandCtx, responseRef: response });
          break;
        default:
          throw new Error("Invalid subcommand.");
      }
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

export { vote };
