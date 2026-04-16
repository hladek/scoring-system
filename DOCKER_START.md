# Docker Deployment Guide

## Running Services

- **PostgreSQL** - Port 5432 (internal)
- **Flask Backend** - Port 8000 (internal)
- **Nginx Frontend** - Port 80 (exposed)

## Quick Start

```bash
docker compose up -d
```

Access the application at `http://localhost`

## Default Credentials

- Username: `admin`
- Password: `admin123`

## Common Commands

```bash
# Check service status
docker compose ps

# View logs
docker compose logs -f

# Rebuild after code changes
docker compose up --build -d

# Stop services
docker compose down
```

## Health Check

```bash
curl http://localhost/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected"
}
```

## Architecture

Nginx serves the React frontend and proxies API requests:
- `/api/*` → Flask backend
- `/socket.io/*` → WebSocket server
- `/health` → Backend health check

## Troubleshooting

View service logs:
```bash
docker compose logs backend
docker compose logs frontend
docker compose logs db
```

If port 80 is in use, modify `docker-compose.yml`:
```yaml
frontend:
  ports:
    - "8080:80"
```

Then access at `http://localhost:8080`

## Data Persistence

Database data persists in Docker volumes. To remove:
```bash
docker compose down -v
```
