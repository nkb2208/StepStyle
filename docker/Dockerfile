FROM node:20-alpine

RUN apk add --no-cache curl

WORKDIR /app

COPY package.json bun.lock ./
RUN npm install --production

COPY dist/ ./dist/
COPY config/ ./config/

USER node

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

CMD ["node", "dist/server.js"]