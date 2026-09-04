FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

# Étape finale : le CLI npm n'est pas nécessaire pour exécuter l'app,
# on ne copie que le résultat du build (élimine les CVEs du npm bundlé)
FROM node:18-alpine
WORKDIR /app
COPY --from=build /app ./
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser
EXPOSE 3000
CMD ["node", "server.js"]