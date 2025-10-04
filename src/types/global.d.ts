import { ConfigType } from "@config";
import { Storage } from "@storage";
import { Client } from "discord.js";

type HandlerContext = {
  client: Client<boolean>;
  config: ConfigType;
  storage: Storage;
};

export type { HandlerContext };
