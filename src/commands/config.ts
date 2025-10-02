import { ApplicationCommandOptionType } from "discord.js";
import {
  Command,
  CommandContext,
  CommandContextRequire,
} from "@types-local/commands";

enum ConfigCommandOptions {
  VIEW = "view",
  SET = "set",
}

const config = {
  name: "config",
  description: "View or change configs for this server.",
  options: [
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: "view",
      description: "View all configurations for this server.",
    },
    {
      type: ApplicationCommandOptionType.SubcommandGroup,
      name: "set",
      description: "Set the value of a configuration variable.",
      options: [
        {
          type: ApplicationCommandOptionType.Subcommand,
          name: "action_threshold",
          description:
            "Threshold for a vote to pass or fail (excluding bots and target).",
          options: [
            {
              type: ApplicationCommandOptionType.Integer,
              name: "threshold",
              description:
                "Number of votes it takes to pass or fail a vote (excluding bots and target).",
              required: true,
            },
          ],
        },
      ],
    },
  ],
  execute: async (
    commandCtx: CommandContextRequire<CommandContext, "config" | "storage">
  ) => {
    const { interaction, config: botConfig, storage } = commandCtx;
    if (!interaction.isChatInputCommand()) return;
    const subCommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    try {
      if (!guildId) throw new Error("Null guild ID on retrieve.");
      switch (subCommand) {
        case ConfigCommandOptions.VIEW:
          const serverConfigs = await storage.retrieveConfigs(guildId);
          const configsText = Object.entries(serverConfigs)
            .map(([key, value]) => `${key}: ${value}`)
            .join("\n");
          const viewReply = `## ${interaction.guild?.name}\n### Configuration Variables\n\`\`\`json\n${configsText}\`\`\``;
          await interaction.reply(viewReply);
          break;
        case ConfigCommandOptions.SET:
          //set
          break;
        default:
          throw new Error("Unknown subcommand of config chosen.");
      }
    } catch (e) {
      let errMsg =
        "Something went wrong in the background. Contact the developers for help.";
      if (interaction.isRepliable()) {
        if (interaction.replied || interaction.deferred) {
          interaction.followUp(errMsg).catch((e) => console.error(e));
        }
      } else {
        console.error(
          "Couldn't forward error through interaction reply or follow up."
        );
      }

      console.error(`[config]: ${e}`);
    }
  },
} satisfies Command;

export { config };
