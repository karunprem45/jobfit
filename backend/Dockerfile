# Build context is the repo root, not backend/, because the matcher and the
# skills catalog live in shared/ and are used by the browser build too.
# The layout inside the image mirrors the repo so relative imports are identical
# in development and in production.
FROM node:20-alpine

WORKDIR /app

# Manifests first. Docker caches this layer, so dependencies are only
# reinstalled when package.json changes — not on every source edit.
COPY backend/package*.json ./backend/
RUN cd backend && npm install --omit=dev

COPY backend/src ./backend/src
COPY shared ./shared

# Run as the built-in non-root user rather than root.
USER node

EXPOSE 3001
CMD ["node", "backend/src/server.js"]
