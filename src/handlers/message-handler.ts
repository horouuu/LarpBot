import type { ConfigType as ConfigType } from "@config";
import { Message, MessageType } from "discord.js";

export async function messageHandler(msg: Message, config: ConfigType) {
  if (
    msg.guildId != config.targetGuildId ||
    msg.channelId != config.targetChannelId ||
    msg.type != MessageType.UserJoin
  )
    return;

  try {
    await msg.react("✅");
    await msg.react("❌");
  } catch (e) {
    console.error(e);
  }
}
