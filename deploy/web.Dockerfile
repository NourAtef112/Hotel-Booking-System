# Builds a Vite single-page app and serves it with nginx.
# Used for both the guest site and the admin dashboard:
#   docker build -f deploy/web.Dockerfile --build-arg APP_DIR=web-app .
#
# The app is built with an empty API base URL, so it calls /api/... on its own
# origin and nginx forwards those calls to the backend. No CORS needed.
FROM node:20-alpine AS build
ARG APP_DIR
WORKDIR /src
COPY ${APP_DIR}/package*.json ./
RUN npm ci
COPY ${APP_DIR}/ ./
ENV VITE_API_BASE_URL=""
RUN npm run build

FROM nginx:1.27-alpine
COPY deploy/nginx/spa.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost/ >/dev/null || exit 1
