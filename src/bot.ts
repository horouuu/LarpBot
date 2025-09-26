import { MessageType, Partials, REST, Routes } from "discord.js";
import { Client, Events, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";
import { loadCommands } from "./commands";

dotenv.config({ path: "../.env" });

const commands = await loadCommands();
const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

console.log(`Loaded commands:\n\n ${JSON.stringify(commands, null, 2)}`);

try {
  console.log("Started refreshing application commands.");

  await rest.put(Routes.applicationCommands(process.env.APP_ID), {
    body: Object.values(commands),
  });
} catch (err) {
  console.error(err);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// ready listener
client.on(Events.ClientReady, async (readyClient) => {
  console.log(`Successfully logged in as ${readyClient.user.tag}!`);
});

// command handler
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  console.log(
    `\n➡️   Command [${interaction.commandName}] called by user ${
      interaction.user.username
    } | ${interaction.user.id} ${
      interaction.inCachedGuild() ? `(${interaction.member.nickname})` : null
    }`
  );

  if (interaction.commandName in commands) {
    await commands[interaction.commandName].execute(interaction);
  }
});

// message handler
client.on(Events.MessageCreate, async (msg) => {
  if (
    msg.guildId != "407456512366084097" ||
    msg.channelId != "474570283886575657" ||
    msg.type != MessageType.UserJoin
  )
    return;

  msg.react("✅");
});

// reactions handler
client.on(Events.MessageReactionAdd, async (reaction) => {
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (e) {
      console.error(e);
      return;
    }
  }

  if (
    reaction.message.guildId != "407456512366084097" ||
    reaction.message.channelId != "474570283886575657"
  )
    return;

  const cache = reaction.message.reactions.cache;
  if (cache.has("✅")) {
    const count = cache.get("✅")?.count ?? 0;
    if (count - 1 >= 2) {
      console.log("User verified!");
      return;
    }
  }
});

client.login(process.env.TOKEN);
