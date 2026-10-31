# B Diamond Barbershop website.
#   docker build -t bdiamond-web .
#   docker run -d --name bdiamond-web -p 3000:3000 --env-file .env.production --restart unless-stopped bdiamond-web
# Settings (mail, shop account, backend addresses) are read when the container starts,
# so the same image works anywhere. See DOCKER.md.

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* values are fixed into the pages when the image is built. All are optional.
ARG NEXT_PUBLIC_BRANCH_ID
ARG NEXT_PUBLIC_SHOP_CAPACITY
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS run
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup -S app && adduser -S app -G app
COPY --from=build /app/public ./public
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
USER app
EXPOSE 3000
CMD ["node", "server.js"]
