# LarpBot
## Usage
1. Copy `.env.template`, fill it accordingly, and rename it to `.env`.
2. Run `docker compose --build up -D`.

## Development
1. Copy `.env.template`, fill it accordingly, and rename it to `.env`.
2. Run `npm i`.
3. Execute the dev script using `npm run dev`.

Notes:
- Test builds using `npm run build`.
- Use `src/scripts/updateTypes.ts` to generate a new type file when adding new commands.
- To test the build during development, `src/scripts/load-env.ps1` (Windows Powershell) is provided to copy all `.env` variables into the environment.
- You'll have to manually set `NODE_ENV=production` in your environment in order to test the build during development.