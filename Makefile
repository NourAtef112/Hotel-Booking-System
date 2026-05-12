.PHONY: up down build logs shell migrate seed test health

up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose build --no-cache

logs:
	docker compose logs -f

shell:
	docker compose exec backend bash

migrate:
	docker compose exec backend alembic upgrade head

seed:
	docker compose exec backend python seed.py

test:
	docker compose exec backend pytest tests/ -v

health:
	curl -s http://localhost:8000/health | python -m json.tool
