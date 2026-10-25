# Deploying E-JUST Guest Housing on University Servers

This guide is for the E-JUST IT team. It installs the complete system on one
Linux server with Docker. Expect about 30 minutes.

## What gets installed

| Service | What it is | Reachable at |
|---|---|---|
| `db` | PostgreSQL 15 holding users, rooms and bookings | Private, not exposed |
| `backend` | FastAPI booking API; applies database migrations on start | Port `8000` (`API_PORT`) |
| `admin` | Housing-office dashboard (rooms, bookings, calendar, guests, housekeeping) | Port `8080` (`ADMIN_PORT`) |
| `backup` | Nightly compressed database dump, kept 14 days | `./backups/` on the server |
| `guest` | Public booking site, once exported from Framer (optional, see below) | Port `80` (`GUEST_PORT`) |

Guests pay at the reception desk by default: a booking arrives as **pending**,
staff confirm it in the dashboard once paid, and mark it **completed** at check-out.
Online card payment (Paymob) is built in but switched off until the university
has its own Paymob merchant account.

## Requirements

- Linux server, 2 vCPU, 4 GB RAM, 20 GB disk (more disk for long backup history)
- Docker Engine 24+ with the Compose plugin
- The university's HTTPS reverse proxy or load balancer, with DNS names such as
  `housing.ejust.edu.eg`, `housing-admin.ejust.edu.eg` and `housing-api.ejust.edu.eg`

## 1. Configure

```bash
git clone https://github.com/NourAtef112/Hotel-Booking-System.git ejust-housing
cd ejust-housing
cp .env.production.example .env.production
```

Edit `.env.production`. At minimum set:

| Setting | How |
|---|---|
| `POSTGRES_PASSWORD` | `openssl rand -base64 32` |
| `SECRET_KEY` | `openssl rand -hex 32` (signs login tokens; changing it logs everyone out) |
| `ALLOWED_ORIGINS` | The public HTTPS addresses of the guest site and dashboard, comma-separated |

The backend **refuses to start** in production with a default `SECRET_KEY`,
wildcard CORS, or payments switched on without Paymob keys. This is deliberate.

## 2. Start

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
docker compose -f docker-compose.prod.yml --env-file .env.production ps
```

All services should show `healthy` or `running` within a minute or two.

## 3. Create the first housing-office account

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec backend \
    python -m scripts.create_admin --email housing@ejust.edu.eg --name "Housing Office"
```

You are prompted for a password (12+ characters). Run it again with another email
for each staff member. Running it on an existing account resets its password.

## 4. Point HTTPS at the services

Configure the university reverse proxy:

| Public name | Forward to |
|---|---|
| `https://housing-admin.ejust.edu.eg` | `http://<server>:8080` |
| `https://housing-api.ejust.edu.eg` | `http://<server>:8000` |
| `https://housing.ejust.edu.eg` | Framer (custom domain) or `http://<server>:80` if self-hosted |

WebSocket upgrade must be allowed for `/ws/` (live room availability).

## 5. Add the real rooms

Sign in to the dashboard and add each room under **Rooms** (number, type,
nightly price in EGP). The system starts empty; `SEED_DEMO_DATA=false` keeps
sample rooms out of production.

## 6. Verify

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec backend \
    python -m scripts.smoke_test --base-url http://localhost:8000 \
    --admin-email housing@ejust.edu.eg --admin-password '<password>'
```

This runs 16 end-to-end checks, including 20 simultaneous bookings for the same
room (exactly one must succeed). **It writes test data** (a room numbered
`SMOKE-…` and test guests), so run it before go-live and delete that room after.

## The guest booking site

The public site is designed in Framer. Two supported setups:

1. **Hosted on Framer (works today).** Connect `housing.ejust.edu.eg` as a
   custom domain on a paid Framer site plan, and set the API address inside the
   site's code components to `https://housing-api.ejust.edu.eg`. Add the site's
   address to `ALLOWED_ORIGINS`.
2. **Self-hosted.** Export the Framer site to React into `./guest-site`, then:
   `docker compose -f docker-compose.prod.yml --env-file .env.production --profile self-hosted-guest up -d --build`

## Day-to-day operations

| Task | Command (prefix: `docker compose -f docker-compose.prod.yml --env-file .env.production`) |
|---|---|
| View logs | `logs -f backend` |
| Update to a new release | `git pull` then `up -d --build` (migrations run automatically) |
| Manual backup now | `exec backup sh -c 'pg_dump --no-owner \| gzip > /backups/manual_$(date +%F).sql.gz'` |
| Restore a backup | `gunzip -c backups/<file>.sql.gz \| docker compose ... exec -T db psql -U housing ejust_housing` |
| Stop everything | `down` (data persists in the `db_data` volume) |

Copy `./backups/` off the server regularly; a backup on the same disk does not
survive a disk failure.

## Data protection

Bookings store guest phone numbers and national ID numbers, which are personal
data under Egypt's Personal Data Protection Law (Law No. 151 of 2020). The
system limits access to them: dashboard endpoints require an admin login, the
database is not exposed outside the Docker network, and passwords are hashed
with bcrypt. The university should still decide who receives admin accounts,
how long booking records are kept, and include the server and backups in its
existing data-protection procedures.

## How double booking is prevented

Two layers, both verified under concurrent load:

1. The API locks the room's database row while checking for overlaps, so
   simultaneous requests for one room are processed one at a time.
2. A PostgreSQL exclusion constraint (`bookings_no_overlap`) rejects any two
   active bookings for the same room with overlapping dates, even if a future
   code change or a manual SQL edit tried to create one.

Back-to-back stays (one guest checks out the day the next checks in) are allowed.
