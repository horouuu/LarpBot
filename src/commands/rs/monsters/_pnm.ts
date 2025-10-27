import { LootTable } from "oldschooljs";
import { SimpleMonster } from "../_module-remap.js";
import { attachWikiURL } from "../_rs-utils.js";

const PhosanisTable = new LootTable()
  .tertiary(35, "Clue scroll (elite)")
  .tertiary(1400, "Little nightmare")
  .tertiary(200, "Parasitic egg")
  .tertiary(4000, "Jar of dreams")
  .tertiary(1, "Big bones")

  .add("Nightmare staff", 1, 19)
  .add("Inquisitor's great helm", 1, 14)
  .add("Inquisitor's hauberk", 1, 14)
  .add("Inquisitor's plateskirt", 1, 14)
  .add("Inquisitor's mace", 1, 8)
  .add("Eldritch orb", 1, 7)
  .add("Harmonised orb", 1, 7)
  .add("Volatile orb", 1, 7)

  .add("Cosmic rune", [247, 420], 400)
  .add("Nature rune", [165, 305], 400)
  .add("Death rune", [165, 305], 400)
  .add("Blood rune", [343, 765], 400)
  .add("Soul rune", [110, 228], 400)
  .add("Cannonball", [137, 382], 400)
  .add("Rune arrow", [412, 957], 300)

  .add("Mithril ore", [165, 305], 500)
  .add("Coal", [220, 485], 400)
  .add("Gold ore", [165, 305], 400)
  .add("Adamantite ore", [40, 95], 400)
  .add("Magic logs", [40, 95], 400)
  .add("Grimy cadantine", [13, 26], 400)
  .add("Grimy torstol", [13, 26], 400)
  .add("Snapdragon seed", [5, 10], 300)
  .add("Uncut emerald", [33, 75], 300)
  .add("Uncut ruby", [27, 60], 300)
  .add("Runite ore", [11, 26], 200)

  .add("Bass", [16, 29], 600)
  .add("Shark", [13, 26], 600)
  .add("Prayer potion(3)", [8, 15], 500)
  .add("Sanfew serum(3)", [6, 12], 500)
  .add("Saradomin brew(3)", [8, 15], 500)
  .add("Zamorak brew(3)", [8, 15], 500)

  .add("Coins", [41417, 73590], 200);

const Pnm = new SimpleMonster({
  id: 377,
  name: "Phosani's Nightmare",
  table: PhosanisTable,
  aliases: ["pnm", "phosanis", "phosani's", "phosanis nightmare"],
});

attachWikiURL(Pnm, "https://oldschool.runescape.wiki/w/Phosani's_Nightmare");
export { Pnm };
