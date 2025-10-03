import { persistedConfigs, PersistedKey } from "@storage";
import { CommandContext } from "@types-local/commands";

const ERR_MSG_GENERIC =
  "Something went wrong in the background. Contact the developers for help.";

type SnakeToCamel<S extends string> = S extends `${infer Head}_${infer Tail}`
  ? `${Lowercase<Head>}${Capitalize<SnakeToCamel<Tail>>}`
  : `${Lowercase<S>}`;

function snakeToCamel<T extends string>(str: T): SnakeToCamel<T> {
  return str
    .split("_")
    .map((s, i) =>
      i == 0
        ? s.toLowerCase()
        : s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
    )
    .join("") as SnakeToCamel<T>;
}

async function catchAllInteractionReply(
  interaction: CommandContext["interaction"],
  errMsg: string = ERR_MSG_GENERIC
) {
  if (!errMsg) errMsg = ERR_MSG_GENERIC;
  if (interaction.isRepliable()) {
    if (interaction.replied || interaction.deferred) {
      interaction.followUp(errMsg).catch((e) => console.error(e));
    } else {
      interaction.reply(errMsg).catch((e) => console.error(e));
    }
  } else {
    console.error(
      "Couldn't forward error through interaction reply or follow up."
    );
  }
}

function isPersistedKey(str: string): str is PersistedKey {
  return (persistedConfigs as readonly string[]).includes(str);
}

export type { SnakeToCamel };
export { snakeToCamel, catchAllInteractionReply, isPersistedKey };
