import {
  ApplicationCommandOptionType,
  PermissionFlagsBits,
} from "discord.js";
import {
  Command,
  CommandContext,
  CommandContextRequire,
} from "@types-local/commands";
import { PersistedConfigs, PersistedKey, Storage } from "@storage";
import { catchAllInteractionReply, isPersistedKey, snakeToCamel } from "@utils";

enum ConfigCommandOptions {
  VIEW = "view",
  SET = "set",
}

type ConfigCommandContext = {
  interaction: CommandContext["interaction"];
  guildId: string;
  storage: Storage;
};

async function handleView(viewCtx: ConfigCommandContext) {
  const { interaction, guildId, storage } = viewCtx;
  const serverConfigs = await storage.retrieveConfigs(guildId);
  const configsText = Object.entries(serverConfigs)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
  const viewReply = `## ${interaction.guild?.name}\n### Configuration Variables\n\`\`\`json\n${configsText}\`\`\``;
  await interaction.reply(viewReply);
}

function getConfigObj<K extends PersistedKey>(
  key: PersistedKey,
  value: PersistedConfigs[K]
): Pick<PersistedConfigs, K> {
  return { [key]: value } as Pick<PersistedConfigs, K>;
}

async function handleSet(setCtx: ConfigCommandContext) {
  const { interaction, guildId, storage } = setCtx;
  const toSetKey = snakeToCamel(interaction.options.getSubcommand());

  let toSetValue = null;
  let toPrint = null;
  switch (toSetKey) {
    case "actionThreshold":
      toSetValue = interaction.options.getInteger("threshold");
      toPrint = `\`${toSetValue}\``;
      break;
    case "memberRole":
      toPrint = interaction.options.getRole("role");
      toSetValue = toPrint?.id;

      break;
    default:
      throw new Error("Invalid config key.");
  }

  if (!toSetValue) throw Error(`Missing value to set key ${toSetKey}`);
  if (!isPersistedKey(toSetKey)) throw Error(`Invalid key to set: ${toSetKey}`);

  const configPayload = getConfigObj(toSetKey, toSetValue);
  await storage.registerConfig(guildId, configPayload);

  await interaction.reply(
    `Successfully set \`${toSetKey}\` to ${toPrint} for server **${interaction.guild?.name}**.`
  );
}

const config = {
  name: "config",
  description: "View or change configs for this server.",
  default_member_permissions: PermissionFlagsBits.Administrator.toString(),
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
            "Change the threshold for a vote to pass or fail (excluding bots and target).",
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
        {
          type: ApplicationCommandOptionType.Subcommand,
          name: "member_role",
          description:
            "Change the role that gatekeeper will assign to new members.",
          options: [
            {
              type: ApplicationCommandOptionType.Role,
              name: "role",
              description: "Role for gatekeeper to assign new members.",
              required: true,
            },
          ],
        },
      ],
    },
  ],
  execute: async (
    commandCtx: CommandContextRequire<CommandContext, "storage">
  ) => {
    const { interaction, storage } = commandCtx;
    if (!interaction.isChatInputCommand()) return;
    const choice =
      interaction.options.getSubcommandGroup() ??
      interaction.options.getSubcommand();

    const guildId = interaction.guildId;
    try {
      if (!guildId) throw new Error("Null guild ID on retrieve.");
      switch (choice) {
        case ConfigCommandOptions.VIEW:
          await handleView({ interaction, guildId, storage });
          break;
        case ConfigCommandOptions.SET:
          await handleSet({ interaction, guildId, storage });
          break;
        default:
          throw new Error("Unknown subcommand chosen.");
      }
    } catch (e) {
      console.error(`[config]: ${e}`);
      catchAllInteractionReply(interaction);
    }
  },
} satisfies Command;

export { config };
