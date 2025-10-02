import type { ConfigType } from "@config";
import { CommandName } from "@/types/generated/commands";
import { CommandsMap, loadCommands } from "@commands/index.js";
import {
  Interaction,
  ChatInputCommandInteraction,
  GuildMember,
  REST,
  Routes,
} from "discord.js";

export async function initCommands(config: ConfigType) {
  const commands = await loadCommands();
  const rest = new REST({ version: "10" }).setToken(config.token);

  console.log(`\nLoaded commands:\n ${JSON.stringify(commands, null, 2)}\n`);

  try {
    console.log("Started refreshing application commands.");

    await rest.put(Routes.applicationCommands(config.appId), {
      body: Object.values(commands),
    });
  } catch (err) {
    console.error(err);
  }

  return commands;
}

export async function commandHandler(
  interaction: Interaction,
  commands: CommandsMap,
  config: ConfigType
) {
  if (!isKnownChatCommand(interaction, commands)) return;

  console.log(
    `\n➡️   Command [${interaction.commandName}] called by user ${
      interaction.user.username
    } | ${interaction.user.id} ${
      interaction.inCachedGuild() ? getMemberNickname(interaction.member) : null
    }`
  );

  try {
    await commands[interaction.commandName].execute(interaction, config);
  } catch (e) {
    console.error(e);

    try {
      const notifMsg =
        "Something went wrong! Please contact the developer for help.";
      if (interaction.replied || interaction.deferred) {
        interaction.followUp(notifMsg);
      } else {
        interaction.reply(notifMsg);
      }
    } catch (e) {
      console.error("Error notification failed to send:\n", e);
    }
  }
}

function isKnownChatCommand(
  i: Interaction,
  cmds: CommandsMap
): i is ChatInputCommandInteraction & { commandName: CommandName } {
  return i.isChatInputCommand() && i.commandName in cmds;
}

function getMemberNickname(member: GuildMember) {
  return member.nickname ? `(${member.nickname})` : "";
}
