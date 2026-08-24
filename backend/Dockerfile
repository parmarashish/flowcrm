FROM node:20-alpine AS base
WORKDIR /app

COPY package.json package-lock.json* ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
RUN npm install

COPY backend ./backend
WORKDIR /app/backend
RUN npm run build

EXPOSE 5000
CMD ["node", "dist/server.js"]
