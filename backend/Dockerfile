# ---- Étape 1 : dépendances ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

# ---- Étape 2 : runtime ----
FROM node:22-alpine AS runtime

# Applique les correctifs Alpine disponibles, puis retire le CLI npm :
# il n'est pas nécessaire à l'exécution et concentre une grande partie des CVE.
RUN apk upgrade --no-cache \
 && rm -rf /usr/local/lib/node_modules/npm \
           /usr/local/bin/npm /usr/local/bin/npx

WORKDIR /app
COPY --from=deps --chown=node:node /app/node_modules ./node_modules

# Copie explicite (docker:S6470) : un COPY . . embarquerait tout le contexte
# de build — .env, clés, .git. Ici, seul ce qui est nommé entre dans l'image.
COPY --chown=node:node package.json ./
COPY --chown=node:node server.js ./
COPY --chown=node:node routes ./routes
COPY --chown=node:node services ./services
COPY --chown=node:node utils ./utils
COPY --chown=node:node sandbox ./sandbox
COPY --chown=node:node database ./database

USER node
EXPOSE 3000
CMD ["node", "server.js"]