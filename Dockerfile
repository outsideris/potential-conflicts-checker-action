FROM node:12-slim

COPY package*.json ./

RUN npm ci

COPY . .

ENTRYPOINT ["node", "/index.js"]
