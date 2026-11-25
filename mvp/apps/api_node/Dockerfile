FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
COPY packages/connectors/package.json ./packages/connectors/
COPY apps/api_node/package.json ./apps/api_node/
RUN npm install --omit=dev
COPY packages/connectors ./packages/connectors
COPY apps/api_node ./apps/api_node
RUN npm run build --workspace=apps/api_node
EXPOSE 3000
CMD ["node", "apps/api_node/dist/server.js"]
