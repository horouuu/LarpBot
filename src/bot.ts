import { Partials } from "discord.js";
import { Client, Events, GatewayIntentBits } from "discord.js";
import { Config } from "@config";
import { commandHandler, initCommands } from "@handlers/command-handler";
import { messageHandler } from "@handlers/message-handler";
import { reactionHandler } from "@handlers/reaction-handler";

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

const commands = await initCommands();
client.on(Events.InteractionCreate, (interaction) =>
  commandHandler(interaction, commands)
);

client.on(Events.MessageCreate, (msg) => messageHandler(msg, Config));

client.on(Events.MessageReactionAdd, (reaction) =>
  reactionHandler(reaction, Config)
);

client.login(Config.token);
