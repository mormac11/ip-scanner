# API Usage Examples

This document provides practical examples for using the IP Scanner API.

## Adding Targets

### Add a Single IP Address

```bash
curl -X POST http://localhost:8080/api/v1/targets \
  -H "Content-Type: application/json" \
  -d '{
    "target": "192.168.1.1",
    "description": "Home Router"
  }'
```

### Add a Subnet (CIDR)

```bash
curl -X POST http://localhost:8080/api/v1/targets \
  -H "Content-Type: application/json" \
  -d '{
    "target": "10.0.0.0/24",
    "description": "Office Network"
  }'
```

### Add Multiple Subnets

```bash
# Corporate network
curl -X POST http://localhost:8080/api/v1/targets \
  -H "Content-Type: application/json" \
  -d '{"target": "172.16.0.0/24", "description": "Corporate LAN"}'

# DMZ
curl -X POST http://localhost:8080/api/v1/targets \
  -H "Content-Type: application/json" \
  -d '{"target": "172.16.1.0/24", "description": "DMZ"}'
```

## Viewing Results

### Get All Open Ports

```bash
curl http://localhost:8080/api/v1/results/open | jq
```

Example response:
```json
[
  {
    "id": 123,
    "target_id": 1,
    "ip_address": "192.168.1.1",
    "port": 80,
    "status": "open",
    "scanned_at": "2025-11-26T10:30:00Z",
    "response_time_ms": 15,
    "target_description": "Home Router"
  },
  {
    "id": 124,
    "target_id": 1,
    "ip_address": "192.168.1.1",
    "port": 443,
    "status": "open",
    "scanned_at": "2025-11-26T10:30:02Z",
    "response_time_ms": 18,
    "target_description": "Home Router"
  }
]
```

### Get Latest Scan Results (All Ports)

```bash
curl http://localhost:8080/api/v1/results/latest | jq
```

### Get Results for Specific IP

```bash
curl "http://localhost:8080/api/v1/results/ip?ip=192.168.1.100" | jq
```

### View Scan Sessions

```bash
curl http://localhost:8080/api/v1/results/sessions | jq
```

Example response:
```json
[
  {
    "id": 5,
    "started_at": "2025-11-26T10:30:00Z",
    "completed_at": "2025-11-26T10:35:23Z",
    "targets_scanned": 45,
    "ports_scanned": 810,
    "status": "completed"
  }
]
```

## Managing Targets

### List All Targets

```bash
curl http://localhost:8080/api/v1/targets | jq
```

Example response:
```json
[
  {
    "id": 1,
    "target": "192.168.1.0/24",
    "description": "Home Network",
    "enabled": true,
    "created_at": "2025-11-26T09:00:00Z",
    "updated_at": "2025-11-26T09:00:00Z"
  }
]
```

### Disable a Target

```bash
curl -X PUT http://localhost:8080/api/v1/targets/1/toggle
```

This toggles the enabled state. Run again to re-enable.

### Delete a Target

```bash
curl -X DELETE http://localhost:8080/api/v1/targets/1
```

## Monitoring Examples

### Watch for Open Ports Every Minute

```bash
watch -n 60 'curl -s http://localhost:8080/api/v1/results/open | jq ".[].ip_address, .port"'
```

### Count Total Open Ports

```bash
curl -s http://localhost:8080/api/v1/results/open | jq 'length'
```

### Find All IPs with Port 22 Open

```bash
curl -s http://localhost:8080/api/v1/results/open | \
  jq '.[] | select(.port == 22) | .ip_address'
```

### Get Open Ports Grouped by IP

```bash
curl -s http://localhost:8080/api/v1/results/open | \
  jq 'group_by(.ip_address) | map({ip: .[0].ip_address, ports: [.[].port]})'
```

## Integration Examples

### Python Script

```python
import requests
import json

# Add target
response = requests.post(
    'http://localhost:8080/api/v1/targets',
    json={
        'target': '192.168.1.0/24',
        'description': 'Test Network'
    }
)
print(f"Target added: {response.json()}")

# Get open ports
response = requests.get('http://localhost:8080/api/v1/results/open')
open_ports = response.json()

for result in open_ports:
    print(f"{result['ip_address']}:{result['port']} - {result['status']}")
```

### Bash Monitoring Script

```bash
#!/bin/bash

# Monitor for new open ports
PREVIOUS_COUNT=0

while true; do
    CURRENT_COUNT=$(curl -s http://localhost:8080/api/v1/results/open | jq 'length')

    if [ $CURRENT_COUNT -gt $PREVIOUS_COUNT ]; then
        echo "Alert: New open ports detected! Count: $CURRENT_COUNT"
    fi

    PREVIOUS_COUNT=$CURRENT_COUNT
    sleep 300  # Check every 5 minutes
done
```
