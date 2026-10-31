# Hosting the website with Docker

The website is one container. It listens on port **3000** and talks to the Core (3301) and
Auth (3302) services. Customers' browsers only ever talk to the website, which passes their
requests on to the backend.

## 1. Build

On the server, from a copy of this repository:

```bash
docker build -t bdiamond-web .
```

Or load the ready-made image file `bdiamond-web-image.tar.gz`. It holds both Intel/AMD and
ARM versions; Docker picks the one that fits the server.

```bash
gunzip -c bdiamond-web-image.tar.gz | docker load
```

To make that file (needs Docker's containerd image store, the default in recent Docker Desktop):

```bash
docker build --platform linux/amd64,linux/arm64 -t bdiamond-web:latest .
docker save --platform linux/amd64 --platform linux/arm64 bdiamond-web:latest | gzip > bdiamond-web-image.tar.gz
```

## 2. Settings

Make a file called `.env.production` on the server (never commit it). Values come from the
shop owner.

```bash
# Backend addresses, as seen from inside the container.
# The same machine: use the server's private IP or http://host.docker.internal:3301
# (Linux: add --add-host=host.docker.internal:host-gateway to docker run), not localhost.
CORE_BACKEND_URL=http://3.6.123.11:3301
AUTH_BACKEND_URL=http://3.6.123.11:3302

# Shop account that places online bookings and takes barbers' payments (the owner login).
BOOKING_AGENT_USERID=
BOOKING_AGENT_PASSWORD=
BOOKING_STRICT_CHECKS=true

# Customer emails: booking confirmations with calendar invites, and sign-up codes.
SMTP_HOST=premium180.web-hosting.com
SMTP_PORT=465
SMTP_USER=
SMTP_PASS=
MAIL_FROM="B Diamond Barbershop <bookings@example.com>"

# Any long random text, e.g. from: openssl rand -hex 32
SIGNUP_CODE_SECRET=
```

`.env.example` explains every setting. Optional, at build time only:
`docker build --build-arg NEXT_PUBLIC_BRANCH_ID=… --build-arg NEXT_PUBLIC_SHOP_CAPACITY=2 …`

## 3. Run

```bash
docker run -d --name bdiamond-web -p 3000:3000 --env-file .env.production --restart unless-stopped bdiamond-web
```

Check it: open `http://<server>:3000`. Logs: `docker logs -f bdiamond-web`.

## 4. Domain and HTTPS

Put the site behind your web server (nginx, Caddy, a load balancer) with an HTTPS certificate,
forwarding to port 3000. Sign-in and payments must not run over plain http on the internet.

nginx example:

```nginx
server {
  server_name book.example.com;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

`X-Forwarded-For` matters: the site limits sign-up codes and online bookings per visitor IP.

## 5. Updating

```bash
git pull
docker build -t bdiamond-web .
docker rm -f bdiamond-web
docker run -d --name bdiamond-web -p 3000:3000 --env-file .env.production --restart unless-stopped bdiamond-web
```
