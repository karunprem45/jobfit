# ---- Stage 1: build the React bundle ----
# Context is the repo root so shared/ is reachable; the layout mirrors the repo.
FROM node:20-alpine AS build

WORKDIR /app

COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install

COPY frontend ./frontend
COPY shared ./shared

WORKDIR /app/frontend
RUN npm run build

# ---- Stage 2: serve the static files ----
# Multi-stage build: node and the source never ship to production. The final
# image is just nginx plus the compiled assets, ~25MB instead of ~400MB.
FROM nginx:alpine

COPY --from=build /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
