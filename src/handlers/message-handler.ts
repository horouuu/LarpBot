import { Config } from "@/config";
import { Message, MessageType } from "discord.js";

export async function messageHandler(msg: Message, config: Config) {
  if (
    msg.guildId != config.targetGuildId ||
    msg.channelId != config.targetChannelId ||
    msg.type != MessageType.UserJoin
  )
    return;

  msg.react("✅");
  msg.react("❌");
}
