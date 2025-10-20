# LarpBot
## Commands
### Basic
`/gatekeeper view` `/gatekeeper register (channel)` `/gatekeeper delist` \
Listens to join messages in the channel where the command is called. \
Optionally, a channel can be specified instead. 

`/config [config]` `/config view` \
Sets the value for that configuration. \
The "view" subcommand will return the value of all configurations.

`/motd set` `/motd view` \
Sets a message of the day. Currently only accepts string input.

`/votekick [user] (ban)` \
Starts a vote to kick a user. If the optional boolean flag is set, ban instead.

### OSRS-related (/rs)
`/rs clue open` `/rs clue stats` \
Opens clues and views your clue stats. \
Clue tiers are random, ranging from medium to master and are weighted towards hard and elite.

`/rs bank` \
Shows a paginated embed view of your bank.

`/rs sell [item] (quantity)` \
Sell an `(quantity)` of an `[item]` that you possess. \
This will prompt a confirmation message on execution.

`/rs kill [monster]` \
Simulates killing a monster. Puts all loot in your bank, \
or auto-sells and splits them equally for party kills.

`/rs stake [user] (amount)` \
Simulates a whip-stake on OSRS. \
The loser will have `(amount)` coins taken out of their bank and \
transferred to the winner. \
If no amount is entered, the stake will turn into a friendly duel.

`/rs transfer [user] [amount]` \
Transfers `[amount]` coins to `[user]`. \
This will prompt a confirmation message on execution.



## Configurations
`actionThreshold` \
How many valid votes it takes for a vote to pass (or fail). A valid vote is every vote except for the target user and any bot. \
`memberRole` \
Role to give members that passes the gatekeeper.

## Usage
1. Copy `.env.example`, fill it accordingly, and rename it to `.env`.
2. Run `docker compose --build up -D`.

## Development
1. Copy `.env.example`, fill it accordingly, and rename it to `.env`.
2. Run `npm i`.
3. Execute the dev script using `npm run dev`.

Notes:
- Test builds using `npm run build`.
- Use `src/scripts/updateTypes.ts` to generate a new type file when adding new commands.
- To test the build during development, `src/scripts/load-env.ps1` (Windows Powershell) is provided to copy all `.env` variables into the environment.

Redis:
- The namespace scheme is currently `guilds:[guildId]:[category]:[subcategories]`.
- For `rs` commands, the namespace scheme is `users:[userId]:rs:...`.
