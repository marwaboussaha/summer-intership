FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

FROM nginx:alpine
# Ecoute sur 8080 (port non privilegie) et pid dans /tmp : nginx tourne
# en utilisateur non root, il ne peut ecrire ni sur le port 80 ni dans /run.
COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN sed -i -E 's#^pid\s+.*;#pid /tmp/nginx.pid;#' /etc/nginx/nginx.conf \
    && addgroup -S appgroup \
    && adduser -S appuser -G appgroup \
    && chown -R appuser:appgroup /usr/share/nginx/html \
    && chown -R appuser:appgroup /var/cache/nginx \
    && chown -R appuser:appgroup /var/log/nginx \
    && chown -R appuser:appgroup /etc/nginx/conf.d
COPY --from=build /app/dist /usr/share/nginx/html
USER appuser
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]