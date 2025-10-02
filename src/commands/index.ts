import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Command } from "@types-local/commands";
import { CommandName } from "@/types/generated/commands";

export type CommandsMap = {
  [N in CommandName]: Command;
};

const extension: string = process.env.NODE_ENV !== "production" ? ".ts" : ".js";

export async function loadCommands(): Promise<CommandsMap> {
  const currentPath = import.meta.dirname;
  const files = fs
    .readdirSync(currentPath)
    .filter((f) => f !== `index${extension}`)
    .filter((f) => f.endsWith(extension));

  const commands = await Promise.all(
    files.map(async (f) => {
      const mod = await import(pathToFileURL(path.join(currentPath, f)).href);
      const cmdLabel = path.basename(f, path.extname(f));
      const cmd: Command = mod[cmdLabel];

      if (!cmd) {
        throw new Error(`File ${f} does not contain export "${cmdLabel}".`);
      }

      return [cmdLabel, cmd];
    })
  );

  return Object.fromEntries(commands) as CommandsMap;
}
