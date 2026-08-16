# Small, explicit base image — alpine keeps the final image around 150MB.
FROM node:20-alpine

WORKDIR /app

# Copy manifests first. Docker caches this layer, so dependencies are only
# reinstalled when package.json changes — not on every source edit.
COPY package*.json ./
RUN npm install --omit=dev

COPY src ./src

# Run as the built-in non-root user rather than root.
USER node

EXPOSE 3001
CMD ["node", "src/server.js"]
