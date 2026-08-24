FROM node:20-alpine AS base
WORKDIR /app

COPY package.json package-lock.json* ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
RUN npm install

COPY frontend ./frontend
WORKDIR /app/frontend
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
