const json = require("../../node_modules/oldschooljs/dist/data/items/item_data.json");
const curr = require("./prices.json").data;
const fs = require("fs");

for (const [id, item] of Object.entries(json)) {
  if (curr[id]) {
    item.price = Math.round((curr[id].high + curr[id].low) / 2);
  }
}

fs.writeFileSync(
  "./node_modules/oldschooljs/dist/data/items/item_data.json",
  JSON.stringify(json, null, 2),
  "utf8"
);

console.log(`Successfully updated item prices with data from: 10/10/2025`);
