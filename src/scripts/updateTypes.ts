import fs from "node:fs";
import path from "node:path";

const dir = path.resolve(import.meta.dirname, "../commands");
const files = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith(".ts"))
  .filter((f) => f !== "index.ts");

const commandNames = files.map((f) => path.basename(f, path.extname(f)));

const dts = `
  // THIS IS AN AUTO-GENERATED FILE BY /scripts/updateTypes.ts
  import { Command } from "../commands";
  export type CommandName = ${commandNames.map((n) => `"${n}"`).join(" | ")}
  export type CommandsMap = {
  ${commandNames.map((n) => `  ${n}: Command;`).join("\n")}
  }
  `;

const targetDir = path.resolve(import.meta.dirname, "../types/generated");

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir);
}

fs.writeFileSync(path.resolve(targetDir, "commands.d.ts"), dts);

console.log("types/generated/commands.d.ts updated ✅");
