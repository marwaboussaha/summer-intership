FROM node:20-alpine

WORKDIR /app

# Copie uniquement les fichiers de dépendances d'abord (optimise le cache Docker)
COPY package.json ./
RUN npm install --omit=dev

# Copie le reste du code généré
COPY . .

EXPOSE 3000

CMD ["npm", "start"]