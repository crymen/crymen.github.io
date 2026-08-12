FROM node:22

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

EXPOSE 4000

CMD ["npx", "hexo", "server", "-i", "0.0.0.0"]