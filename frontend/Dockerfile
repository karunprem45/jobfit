# ---- Stage 1: build the React bundle ----
FROM node:20-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# ---- Stage 2: serve the static files ----
# Multi-stage build: node and the source never ship to production. The final
# image is just nginx plus the compiled assets, ~25MB instead of ~400MB.
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
