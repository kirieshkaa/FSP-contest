# Backend

## Deps

- docker
- make
- uv


## 1. Setting up PostgreSQL and redis

```sh
cd deployment
make create-env
# setup .env file
make compose-up
```

## 2. Run server

```sh
uv venv
uv pip install -r requirements.txt
uvicorn app.main:app
```
