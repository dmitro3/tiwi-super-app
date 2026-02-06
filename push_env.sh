#!/bin/bash
# Script to push .env variables to Vercel

ENV_FILE=".env"

if [ ! -f "$ENV_FILE" ]; then
    echo "Error: $ENV_FILE not found."
    exit 1
fi

while IFS='=' read -r key value || [ -n "$key" ]; do
    # Skip comments and empty lines
    [[ "$key" =~ ^#.*$ ]] && continue
    [[ -z "$key" ]] && continue
    
    # Trim whitespace from key and value
    key=$(echo "$key" | xargs)
    value=$(echo "$value" | xargs)
    
    # Remove quotes from value if present
    value="${value#\"}"
    value="${value%\"}"
    value="${value#\'}"
    value="${value%\'}"
    
    if [ -n "$key" ]; then
        echo "Pushing $key to Vercel..."
        for env in production preview development; do
            echo -n "$value" | vercel env add "$key" "$env" --force
        done
    fi
done < "$ENV_FILE"
