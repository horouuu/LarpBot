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
COPY --from=builder /app/src/scripts/*.cjs ./build/scripts/
RUN node ./build/scripts/fetch-item-data.cjs
RUN node ./build/scripts/fetch-prices.cjs
RUN node ./build/scripts/update-items.cjs

CMD ["node", "build/bot.js"]
