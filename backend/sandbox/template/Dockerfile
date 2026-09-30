# ---- Etape 1 : dependances ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# ---- Etape 2 : runtime ----
FROM node:22-alpine AS runtime

# Meme remediation que backend/Dockerfile : les CVE remontees par Trivy
# viennent du CLI npm embarque dans l'image Node, pas du code applicatif.
# npm sert uniquement a installer les dependances (etape 1), il n'est pas
# necessaire a l'execution.
RUN apk upgrade --no-cache \
 && rm -rf /usr/local/lib/node_modules/npm \
           /usr/local/bin/npm /usr/local/bin/npx

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY index.js ./

RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
 && chown -R appuser:appgroup /app
USER appuser
EXPOSE 3000

# node directement, puisque npm n'est plus present dans l'image
CMD ["node", "index.js"]