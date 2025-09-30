import { Partials } from "discord.js";
import { Client, Events, GatewayIntentBits } from "discord.js";
import { Config } from "@config";
import { commandHandler, initCommands } from "@handlers/command-handler.js";
import { messageHandler } from "@handlers/message-handler.js";
import { reactionHandler } from "@handlers/reaction-handler.js";

Config.load();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// ready listener
client.on(Events.ClientReady, async (readyClient) => {
  console.log(`Successfully logged in as ${readyClient.user.tag}!`);
});

const commands = await initCommands(Config);
client.on(Events.InteractionCreate, (interaction) =>
  commandHandler(interaction, commands, Config)
);

client.on(Events.MessageCreate, (msg) => messageHandler(msg, Config));

client.on(Events.MessageReactionAdd, (reaction, user) =>
  reactionHandler(reaction, user, Config)
);

client.login(Config.token);
