FROM eclipse-temurin:21-jre-jammy

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl gnupg \
  && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /etc/apt/keyrings \
  && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
    | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
  && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" \
    > /etc/apt/sources.list.d/nodesource.list \
  && apt-get update \
  && apt-get install -y --no-install-recommends nodejs \
  && rm -rf /var/lib/apt/lists/*

RUN npm install -g firebase-tools@15.7.0

WORKDIR /workspace

COPY backend/functions/package*.json ./backend/functions/
RUN npm install --prefix backend/functions

COPY backend ./backend

EXPOSE 4000 5001 8080 9099

CMD ["sh", "-c", "npm --prefix backend/functions run build && firebase emulators:start --project demo-pocketpilot --config backend/firebase/firebase.json --only auth,firestore,functions,ui"]
