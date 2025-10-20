import { Partials } from "discord.js";
import { Client, Events, GatewayIntentBits } from "discord.js";
import { Config } from "@config";
import { commandHandler, initCommands } from "@handlers/command-handler.js";
import { RedisStorage } from "@redis-storage";
import { HandlerContext } from "@types-local/global";
import { gatekeeperEventLoader } from "@handlers/gatekeeper/gatekeeper-event-loader.js";

const config = new Config();
const storage = await RedisStorage.create(config);

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
const handlerCtx: HandlerContext = { client, config, storage };

// ready listener
client.once(Events.ClientReady, async (readyClient) => {
  console.log(
    `\n-----\nBot currently in:\n\n${readyClient.guilds.cache
      .map((g) => `${g.name} | ${g.id}`)
      .join("\n")}\n-----\n`
  );
  console.log(`Successfully logged in as ${readyClient.user.tag}!`);
  await gatekeeperEventLoader(handlerCtx);
});

const commands = await initCommands(config);
client.on(Events.InteractionCreate, (interaction) =>
  commandHandler(interaction, commands, handlerCtx)
);

client.login(config.token);
