const fs = require("fs");
fetch("https://prices.runescape.wiki/api/v1/osrs/latest", {
  method: "GET",
  headers: { "User-Agent": "hourly_prices - @godsel on Discord" },
}).then((res) => {
  if (res.ok) {
    res.json().then((data) => {
      fs.writeFileSync(
        "./src/scripts/prices.json",
        JSON.stringify(data, 2, null),
        "utf8"
      );
      console.log(
        `Successfully fetched data ${new Date().toLocaleTimeString()}`
      );
    });
  } else {
    console.log("Error fetching prices from wiki.");
  }
});
