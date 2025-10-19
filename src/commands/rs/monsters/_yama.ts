import { LootTable } from "oldschooljs";
import { SimpleMonster } from "../_module-remap.js";
import { attachWikiURL } from "../_rs_utils.js";

const YamaUniqueTable = new LootTable()
    .add("Dossier", 1, 826)
    .add("Oathplate shards", 12, 586)
    .add("Forgotten lockbox", 1, 303)
    .add("Soulflame horn", 1, 33)
    .add("Oathplate helm", 1, 17)
    .add("Oathplate body", 1, 17)
    .add("Oathplate legs", 1, 17);

const SupplyDrop = new LootTable()
  .add(new LootTable().add("Pineapple pizza", [3, 4] ).add("Wild pie", [3, 4]))
  .add(new LootTable().add("Prayer potion(3)", 2).add("Super restore mix(2)", 2))
  .add(new LootTable().add("Super combat potion(1)", 1).add("Zamorak mix(2)", 1));

const YamaTable = new LootTable()
    .tertiary(30, "Clue scroll (elite)")
    .tertiary(2500, "Yami")
    .oneIn(19, SupplyDrop)

    .add(YamaUniqueTable)
    .add("Rune chainbody", 8, 526)
    .add("Battlestaff", 40, 421)
    .add("Rune platebody", 8, 315)
    .add("Dragon plateskirt", 1, 210)
    .add("Dragon platelegs", 1, 210)

    .add("Blood rune", 400, 315)
    .add("Law rune", 150, 315)
    .add("Smoke rune", 350, 210)
    .add("Soul rune", 500, 210)
    .add("Soul rune", 1000, 210)
    .add("Fire rune", 40000, 105)
    .add("Wrath rune", 800, 105)

    .add("Aether catalyst", 850, 736)
    .add("Diabolic worms", 90, 736)
    .add("Barrel of demonic tallow (full)", 1, 526)
    .add("Chasm teleport scroll", 6, 421)
    .add("Emerald", 40, 315)
    .add("Ruby", 40, 315)
    .add("Diamond", 40, 315)
    .add("Onyx bolt tips", 150, 105);

const Yama = new SimpleMonster({
  id: 14176,
  name: "Yama",
  table: YamaTable,
  aliases: ["yama"],
});


attachWikiURL(Yama, "https://oldschool.runescape.wiki/w/Yama");
export { Yama };
