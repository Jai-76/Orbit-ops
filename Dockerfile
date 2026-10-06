FROM node:20-alpine
WORKDIR /app
COPY package.json server.js index.html styles.css app.js ./
ENV NODE_ENV=production PORT=4173
EXPOSE 4173
USER node
CMD ["node", "server.js"]
