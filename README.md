# IP Scanner

A Go-based network scanner that monitors IP addresses and subnets for open ports. Scans run automatically every 15 minutes and stores historical results in PostgreSQL.

## Features

- **Automated Scanning**: Scans configured targets every 15 minutes
- **Flexible Targets**: Support for individual IPs or CIDR subnet notation
- **Common Ports**: Scans 18 common ports (SSH, HTTP, HTTPS, MySQL, PostgreSQL, etc.)
- **Historical Data**: Stores all scan results with timestamps
- **REST API**: Full API for managing targets and viewing results
- **Docker Ready**: Fully containerized with Docker Compose

## Architecture

- **Backend**: Go with Gorilla Mux router
- **Database**: PostgreSQL 15
- **Containerization**: Docker & Docker Compose
- **Scanner**: Built-in TCP port scanner
- **Scheduler**: Background worker running every 15 minutes
- **Frontend** (planned): React

## Project Structure

```
ip-scanner/
├── cmd/
│   └── api/
│       └── main.go              # Application entry point
├── internal/
│   ├── database/
│   │   └── postgres.go          # Database connection logic
│   ├── handlers/
│   │   ├── health.go            # Health check endpoint
│   │   ├── targets.go           # Target management API
│   │   └── results.go           # Scan results API
│   ├── models/
│   │   └── models.go            # Data models
│   ├── scanner/
│   │   └── scanner.go           # Port scanning logic
│   └── scheduler/
│       └── scheduler.go         # Background scan scheduler
├── docker-compose.yml           # Docker services configuration
├── Dockerfile                   # Go application container
├── init.sql                     # Database schema
├── go.mod                       # Go dependencies
└── README.md
```

## Prerequisites

- Docker
- Docker Compose

## Getting Started

### 1. Start the application

```bash
docker-compose up --build
```

This will:
- Build the Go application
- Start PostgreSQL database
- Run database migrations from init.sql
- Start the API server on port 8080
- Begin scanning configured targets every 15 minutes

### 2. Verify the application is running

```bash
# Health check
curl http://localhost:8080/health

# API status
curl http://localhost:8080/api/v1/status
```

### 3. Stop the application

```bash
docker-compose down
```

To remove volumes as well:
```bash
docker-compose down -v
```

## Usage

### 1. Add a target to scan

```bash
# Add a single IP
curl -X POST http://localhost:8080/api/v1/targets \
  -H "Content-Type: application/json" \
  -d '{"target": "192.168.1.1", "description": "Router"}'

# Add a subnet (CIDR notation)
curl -X POST http://localhost:8080/api/v1/targets \
  -H "Content-Type: application/json" \
  -d '{"target": "192.168.1.0/24", "description": "Local network"}'
```

### 2. View scan results

```bash
# Get all open ports from latest scan
curl http://localhost:8080/api/v1/results/open

# Get all latest results
curl http://localhost:8080/api/v1/results/latest

# Get results for a specific IP
curl http://localhost:8080/api/v1/results/ip?ip=192.168.1.1

# View scan history
curl http://localhost:8080/api/v1/results/sessions
```

### 3. Manage targets

```bash
# List all targets
curl http://localhost:8080/api/v1/targets

# Disable/enable a target
curl -X PUT http://localhost:8080/api/v1/targets/1/toggle

# Delete a target
curl -X DELETE http://localhost:8080/api/v1/targets/1
```

## API Endpoints

### System
- `GET /health` - Health check endpoint with database status
- `GET /api/v1/status` - API status endpoint

### Target Management
- `POST /api/v1/targets` - Add new IP or subnet to scan
- `GET /api/v1/targets` - List all scan targets
- `DELETE /api/v1/targets/{id}` - Remove a scan target
- `PUT /api/v1/targets/{id}/toggle` - Enable/disable a target

### Scan Results
- `GET /api/v1/results/latest` - Get latest scan results for all IPs
- `GET /api/v1/results/open` - Get only open ports from latest scan
- `GET /api/v1/results/ip?ip={ip}` - Get scan history for specific IP
- `GET /api/v1/results/sessions` - View scan session history

## Scanned Ports

The scanner checks these common ports:
- 21 (FTP)
- 22 (SSH)
- 23 (Telnet)
- 25 (SMTP)
- 53 (DNS)
- 80 (HTTP)
- 110 (POP3)
- 143 (IMAP)
- 443 (HTTPS)
- 445 (SMB)
- 3306 (MySQL)
- 3389 (RDP)
- 5432 (PostgreSQL)
- 5900 (VNC)
- 6379 (Redis)
- 8080 (HTTP Alt)
- 8443 (HTTPS Alt)
- 27017 (MongoDB)

## Database

PostgreSQL is available on `localhost:5432` with the following credentials:

- **Database**: ipscanner
- **User**: postgres
- **Password**: postgres

Connect to the database:
```bash
docker-compose exec postgres psql -U postgres -d ipscanner
```

## Development

### Running locally without Docker

If you have Go installed locally:

```bash
# Install dependencies
go mod download

# Run the application
go run cmd/api/main.go
```

Note: You'll need to configure database connection environment variables.

### Environment Variables

See `.env.example` for available configuration options:

- `PORT` - API server port (default: 8080)
- `DB_HOST` - Database host
- `DB_PORT` - Database port
- `DB_USER` - Database user
- `DB_PASSWORD` - Database password
- `DB_NAME` - Database name

## Adding React Frontend

The docker-compose.yml file includes a commented-out frontend service. To add React:

1. Create a React app in the `frontend/` directory
2. Add a Dockerfile in `frontend/`
3. Uncomment the frontend service in docker-compose.yml
4. Rebuild with `docker-compose up --build`

The backend already includes CORS middleware to support frontend requests.

## Configuration

### Scan Interval

By default, scans run every 15 minutes. To change this, modify the interval in `cmd/api/main.go`:

```go
scanScheduler := scheduler.NewScheduler(db, 15*time.Minute)
```

### Port List

To customize which ports are scanned, edit the `CommonPorts` array in `internal/scanner/scanner.go`.

### Scan Timeout

The default timeout for each port is 2 seconds. Modify in `internal/scheduler/scheduler.go`:

```go
results := scanner.ScanIP(ip, scanner.CommonPorts, 2*time.Second)
```

## Next Steps

- Add authentication/authorization
- Implement alerting for newly opened/closed ports
- Add React frontend for visualization
- Export scan results to CSV/JSON
- Add custom port scanning profiles
- Implement parallel scanning for better performance
- Set up CI/CD pipeline

## License

MIT
