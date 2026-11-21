FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ENV NODE_ENV=development

EXPOSE 3000

CMD ["sh", "-c", "npx prisma db migrate --db \"$DATABASE_URL\" && node src/server.js"]
