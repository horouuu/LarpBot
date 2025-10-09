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
    .readdirSync(currentPath, { recursive: true, withFileTypes: true })
    .filter((f) => f.isFile())
    .filter((f) => !/[A-Z_]/.test(f.name.charAt(0)))
    .filter((f) => f.name !== `index${extension}`)
    .filter((f) => f.name.endsWith(extension));

  const commands = await Promise.all(
    files.map(async (f) => {
      const mod = await import(
        pathToFileURL(path.join(currentPath, f.name)).href
      );
      const cmdLabel = path.basename(f.name, path.extname(f.name));
      const cmd: Command = mod[cmdLabel];

      if (!cmd) {
        throw new Error(`File ${f} does not contain export "${cmdLabel}".`);
      }

      return [cmdLabel, cmd];
    })
  );

  return Object.fromEntries(commands) as CommandsMap;
}
