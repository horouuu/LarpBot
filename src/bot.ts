import { Partials } from "discord.js";
import { Client, Events, GatewayIntentBits } from "discord.js";
import { Config } from "@config";
import { commandHandler, initCommands } from "@handlers/command-handler.js";
import { messageHandler } from "@handlers/message-handler.js";
import { reactionHandler } from "@handlers/reaction-handler.js";
import { RedisStorage } from "@redis-storage";
import { HandlerContext } from "@types-local/global";

const config = new Config();
const storage = await RedisStorage.create(config);
const handlerCtx: HandlerContext = { config, storage };

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

const commands = await initCommands(config);
client.on(Events.InteractionCreate, (interaction) =>
  commandHandler(interaction, commands, handlerCtx)
);

client.on(Events.MessageCreate, (msg) => messageHandler(msg, handlerCtx));

client.login(config.token);
