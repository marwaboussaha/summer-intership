FROM mongo:7.0.15

# Applique les correctifs de sécurité Ubuntu disponibles
RUN apt-get update \
 && apt-get upgrade -y \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/*

# /opt/js-yaml : parseur YAML embarqué pour l'entrypoint, js-yaml 3.x non maintenu.
# La configuration se fait par variables d'environnement, il est inutile ici.
RUN rm -rf /opt/js-yaml

# gosu : binaire Go non patchable, 56 CVE. Il ne sert qu'à l'entrypoint pour
# passer de root à mongod. On fait la même chose nativement avec USER, ce qui
# est de toute façon la bonne pratique (le conteneur ne démarre jamais en root).
RUN rm -f /usr/local/bin/gosu

# Outils clients inutiles en runtime (binaires Go non patchables)
RUN rm -f /usr/bin/bsondump /usr/bin/mongodump /usr/bin/mongorestore \
          /usr/bin/mongoexport /usr/bin/mongoimport /usr/bin/mongostat \
          /usr/bin/mongotop /usr/bin/mongofiles 2>/dev/null || true

# L'entrypoint officiel utilise gosu : on le contourne en démarrant
# directement mongod sous l'utilisateur mongodb.
RUN mkdir -p /data/db /data/configdb \
 && chown -R mongodb:mongodb /data/db /data/configdb

USER mongodb
EXPOSE 27017
ENTRYPOINT ["mongod"]
CMD ["--bind_ip_all"]