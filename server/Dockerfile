FROM node:22-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
ENV TRANSFORMERS_CACHE=/root/.cache

RUN node scripts/preloadModel.js

EXPOSE 4000

CMD ["node", "src/index.js"]