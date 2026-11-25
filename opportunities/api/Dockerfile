FROM node:22.23.4-alpine AS dependencies
WORKDIR /app
RUN npm install --global npm@10.9.9
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:22.23.4-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=dependencies --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json ./package.json
COPY --chown=node:node src ./src
COPY --chown=node:node migrations ./migrations
COPY --chown=node:node public ./public
USER node
EXPOSE 3000
CMD ["node", "src/server.mjs"]
