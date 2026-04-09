FROM node:20-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates wget \
    && update-ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

COPY backend ./
COPY certs ./certs

EXPOSE 3000
CMD ["node", "src/index.js"]
