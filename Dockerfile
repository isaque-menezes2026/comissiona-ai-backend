FROM node:20-slim
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl ca-certificates
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build
EXPOSE 3001
CMD ["sh", "-c", "DATABASE_URL=$DIRECT_URL npx prisma migrate deploy && node dist/main"]
