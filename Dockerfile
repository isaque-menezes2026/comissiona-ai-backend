FROM node:20-slim
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl ca-certificates
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
EXPOSE 3001
CMD ["sh", "-c", "npm run build && node dist/src/main"]
