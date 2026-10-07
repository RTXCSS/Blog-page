FROM node:22-bookworm-slim AS web
WORKDIR /app/Frontend
COPY Frontend/package*.json ./
RUN npm ci
COPY Frontend/ ./
RUN npm run build
FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY app.js ./
COPY models ./models
COPY routes ./routes
COPY middleware ./middleware
COPY services ./services
COPY --from=web /app/Frontend/dist ./Frontend/dist
RUN mkdir -p storage/uploads && chown -R node:node /app/storage
USER node
EXPOSE 8000
CMD ["node", "app.js"]
