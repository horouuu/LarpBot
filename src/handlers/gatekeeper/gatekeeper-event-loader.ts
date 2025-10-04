import { HandlerContext } from "@types-local/global";
import { createGatekeeperCollectors } from "@handlers/gatekeeper/gatekeeper-reactions.js";
import { TextChannel } from "discord.js";

export async function gatekeeperEventLoader(ctx: HandlerContext) {
  const { client, storage } = ctx;
  const gatekeptEntries = await storage.getAllGatekept();

  for (const gatekept of gatekeptEntries) {
    const channel = (await client.channels.fetch(
      gatekept.channelId
    )) as TextChannel;

    if (!channel) {
      console.warn(`Failed to fetch channel: ${channel}.`);
      continue;
    }

    await createGatekeeperCollectors({ ...ctx, channel });
    console.log(
      `[Gatekeeper Loader]: Successfully attached collectors for guild ${gatekept.guildId}`
    );
  }
}
