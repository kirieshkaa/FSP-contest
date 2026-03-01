DEV_COMPOSE=docker-compose.dev.yaml
PROD_COMPOSE=docker-compose.yaml
BUILD_TARGETS=frontend backend

create-env:
	@. ./scripts/create-env.sh

dev-up:
	docker-compose -f $(DEV_COMPOSE) up -d

dev-down:
	docker-compose -f $(DEV_COMPOSE) down

build:
	docker-compose build $(BUILD_TARGETS)

prod-up:
	docker-compose -f $(PROD_COMPOSE) up -d

prod-down:
	docker-compose -f $(PROD_COMPOSE) down
