FROM mongo:7.0.15

# Suppression des binaires clients non nécessaires en runtime,
# qui embarquent des CVEs Go non patchables via apt/npm.
# Si tu as besoin de mongodump/mongorestore pour des backups,
# fais-les tourner depuis un conteneur/job séparé, pas celui-ci.
RUN rm -f /usr/bin/bsondump \
          /usr/bin/mongodump \
          /usr/bin/mongoexport \
          /usr/bin/mongofiles \
          /usr/bin/mongoimport \
          /usr/bin/mongorestore \
          /usr/bin/mongostat \
          /usr/bin/mongotop