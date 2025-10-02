import { ApplicationCommandOptionType } from "discord.js";
import {
  Command,
  CommandContext,
  CommandContextRequire,
} from "@types-local/commands";
import { Storage } from "@storage";
import { catchAllInteractionReply } from "@/utils/utils";

enum ConfigCommandOptions {
  VIEW = "view",
  SET = "set",
}

type ViewContext = {
  interaction: CommandContext["interaction"];
  guildId: string;
  storage: Storage;
};

async function handleView(viewCtx: ViewContext) {
  const { interaction, guildId, storage } = viewCtx;
  const serverConfigs = await storage.retrieveConfigs(guildId);
  const configsText = Object.entries(serverConfigs)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
  const viewReply = `## ${interaction.guild?.name}\n### Configuration Variables\n\`\`\`json\n${configsText}\`\`\``;
  await interaction.reply(viewReply);
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
          await handleView({ interaction, guildId, storage });
          break;
        case ConfigCommandOptions.SET:
          const setOption = interaction.options.getString("");
        default:
          throw new Error("Unknown subcommand of config chosen.");
      }
    } catch (e) {
      catchAllInteractionReply(interaction);
      console.error(`[config]: ${e}`);
    }
  },
} satisfies Command;

export { config };
