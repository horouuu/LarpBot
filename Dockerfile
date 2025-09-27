# BUILD STAGE
FROM node:24-alpine3.21 AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build


# RUNTIME STAGE
FROM node:24-alpine3.21 AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/build ./build

CMD ["node", "build/bot.js"]
