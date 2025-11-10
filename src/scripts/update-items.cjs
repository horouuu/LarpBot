const json = require("./item_data.json");
const curr = require("./prices.json").data;
const fs = require("fs");

for (const [id, item] of Object.entries(json)) {
  if (curr[id]) {
    item.price = Math.round((curr[id].high + curr[id].low) / 2);
  }

  // TEMPORARY PATCH
  // TODO: REMOVE ON FIX
  if (item.name.includes("javelin tips")) {
    item.name = item.name.split(" ")[0] + " javelin heads";
  }
}

fs.writeFileSync(
  "./node_modules/oldschooljs/dist/data/items/item_data.json",
  JSON.stringify(json, null, 2),
  "utf8"
);

console.log(`Successfully updated item prices with newest data.`);
