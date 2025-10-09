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
import { Votekick } from "./vote/Votekick.js";

enum VoteEnum {
  VOTE_KICK = "kick",
  VOTE_BAN = "ban",
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
  )
  .addSubcommand((opt) =>
    opt
      .setName("ban")
      .setDescription("Starts a vote to ban a member.")
      .addUserOption((opt) =>
        opt
          .setName("target")
          .setDescription("Target of the vote.")
          .setRequired(true)
      )
  );

const vote = {
  ...voteData.toJSON(),
  execute: async (
    commandCtx: CommandContextRequire<CommandContext, "config" | "storage">
  ) => {
    const { interaction } = commandCtx;
    if (!interaction.isChatInputCommand()) return;
    const response = await interaction.deferReply({ withResponse: true });
    const cmd = interaction.options.getSubcommand();
    try {
      switch (cmd) {
        case VoteEnum.VOTE_BAN:
        case VoteEnum.VOTE_KICK:
          const target = interaction.options.getUser("target");
          if (!target) throw new Error("Please specify a target.");

          const vkInstance = new Votekick(target, cmd);
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
