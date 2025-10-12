import { LootTable } from "oldschooljs";
import { SimpleMonster } from "../_module-remap.js";
import { attachWikiURL } from "../_rs_utils.js";
import { parseLoot } from "../_rs_utils.js";

// Taken from https://github.com/oldschoolgg/oldschooljs

const NexUniqueTable = new LootTable()
  .add("Zaryte vambraces")
  .add("Nihil horn")
  .add("Torva full helm (damaged)")
  .add("Torva platebody (damaged)")
  .add("Torva platelegs (damaged)")
  .add("Ancient hilt");

const NexTable = new LootTable()
  .tertiary(43, NexUniqueTable)
  .tertiary(48, "Clue scroll (elite)")
  .tertiary(500, "Nexling")
  .tertiary(1, "Big bones")

  .add("Air rune", [123, 1365], 35)
  .add("Fire rune", [210, 1655], 35)
  .add("Blood rune", [84, 325], 50)
  .add("Death rune", [85, 170], 50)
  .add("Water rune", [193, 1599], 35)
  .add("Soul rune", [86, 227], 50)
  .add("Dragon bolts (unf)", [12, 90], 50)
  .add("Onyx bolts (e)", [11, 29], 35)
  .add("Cannonball", [42, 298], 50)

  .add("Air orb", [6, 20], 50)
  .add("Uncut ruby", [3, 26], 50)
  .add("Uncut diamond", [3, 17], 50)
  .add("Wine of zamorak", [4, 14], 50)
  .add("Coal", [23, 95], 35)
  .add("Runite ore", [2, 30], 35)

  .add(
    new LootTable().tertiary(1, "Shark", 3).tertiary(1, "Prayer potion(4)", 1),
    1,
    50
  )
  .add(
    new LootTable()
      .tertiary(1, "Saradomin brew(4)", 3)
      .tertiary(1, "Super restore(4)", 1),
    1,
    50
  )

  .add("Nihil shard", [80, 85], 50)
  .add("Nihil shard", [85, 95], 31)
  .add("Coins", [8539, 26748], 35)
  .add("Blood essence", [1, 2], 10)
  .add("Rune sword", 1, 4);

const Nex = new SimpleMonster({
  id: 13447,
  name: "Nex",
  table: NexTable,
  aliases: ["nex"],
});

attachWikiURL(Nex, "https://oldschool.runescape.wiki/w/Nex");
export { Nex };
