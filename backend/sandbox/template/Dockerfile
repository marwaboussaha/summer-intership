FROM node:22-alpine

# Applique les correctifs Alpine disponibles : sans cette ligne, Trivy
# bloque le pipeline sur les CVE du systeme de base (frontend et backend
# appliquent deja le meme durcissement).
RUN apk upgrade --no-cache

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY src ./src
COPY index.js ./
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser
EXPOSE 3000
CMD ["npm", "start"]