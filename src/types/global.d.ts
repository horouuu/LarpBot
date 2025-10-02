import { ConfigType } from "@config";
import { Storage } from "@storage";

type HandlerContext = {
  config: ConfigType;
  storage: Storage;
};

export type { HandlerContext };
