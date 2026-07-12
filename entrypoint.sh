#!/bin/sh

# Apply Drizzle migrations
pnpm run db:migrate

# Run the CMD command from the dockerfile
exec "$@"
