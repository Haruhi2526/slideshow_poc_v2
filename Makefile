up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

restart:
	docker compose restart

clean:
	docker compose down -v
	docker system prune -f
