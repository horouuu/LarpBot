const fs = require("fs");
fetch("https://prices.runescape.wiki/api/v1/osrs/latest", {
  method: "GET",
  headers: { "User-Agent": "hourly_prices - @godsel on Discord" },
}).then((res) => {
  if (res.ok) {
    res.json().then((data) => {
      const path =
        process.env.NODE_ENV === "production"
          ? "./build/scripts/prices.json"
          : "./src/scripts/prices.json";
      fs.writeFileSync(path, JSON.stringify(data, 2, null), "utf8");
      console.log(
        `Successfully fetched data ${new Date().toLocaleTimeString()}`
      );
    });
  } else {
    console.log("Error fetching prices from wiki.");
  }
});
