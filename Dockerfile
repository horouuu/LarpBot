# BUILD STAGE
FROM node:slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build


# RUNTIME STAGE
FROM node:slim AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/build ./build
COPY --from=builder /app/src/scripts/*.cjs ./build/scripts
RUN node ./build/scripts/update-prices.cjs

CMD ["node", "build/bot.js"]
