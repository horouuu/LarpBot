import { Monsters } from "oldschooljs";
import { Araxxor } from "./_araxxor.js";
import { Nex } from "./_nex.js";
import { Yama } from "./_yama.js";

const CustomMonsters = [Araxxor, Nex, Yama];
const NativeMonsters = [...Monsters].map((m) => m[1]);
export const NewMonsters = [...NativeMonsters, ...CustomMonsters];
