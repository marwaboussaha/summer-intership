FROM mongo:7.0.15

# /opt/js-yaml est embarqué par l'image officielle pour permettre au
# docker-entrypoint.sh de parser un fichier de config mongod au format YAML.
# Il embarque js-yaml 3.x, non maintenu, porteur de 3 CVE.
# On le supprime : la configuration se fait par variables d'environnement.
RUN rm -rf /opt/js-yaml

# Outils clients inutiles en runtime (binaires Go non patchables)
RUN rm -f /usr/bin/bsondump /usr/bin/mongodump /usr/bin/mongorestore \
          /usr/bin/mongoexport /usr/bin/mongoimport /usr/bin/mongostat \
          /usr/bin/mongotop /usr/bin/mongofiles 2>/dev/null || true

EXPOSE 27017