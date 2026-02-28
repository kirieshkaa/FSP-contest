#!/usr/bin/env bash

ENV_FILE=".env"

if [ -f "$ENV_FILE" ]; then
  echo "ENV file already exists"
  exit
fi

cp .env.empty .env

echo "empty .env file created"
