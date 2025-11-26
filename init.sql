-- Initialize database schema

-- Scan targets table (stores IPs/subnets to scan)
CREATE TABLE IF NOT EXISTS scan_targets (
    id SERIAL PRIMARY KEY,
    target VARCHAR(255) NOT NULL UNIQUE, -- IP address or CIDR subnet
    description TEXT,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Scan results table (stores individual IP scan results)
CREATE TABLE IF NOT EXISTS scan_results (
    id SERIAL PRIMARY KEY,
    target_id INTEGER REFERENCES scan_targets(id) ON DELETE CASCADE,
    ip_address INET NOT NULL,
    port INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL, -- 'open', 'closed', 'filtered'
    scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    response_time_ms INTEGER
);

-- Scan sessions table (tracks each scan run)
CREATE TABLE IF NOT EXISTS scan_sessions (
    id SERIAL PRIMARY KEY,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    targets_scanned INTEGER DEFAULT 0,
    ports_scanned INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'running' -- 'running', 'completed', 'failed'
);

-- AWS credentials table (stores AWS configuration)
CREATE TABLE IF NOT EXISTS aws_credentials (
    id SERIAL PRIMARY KEY,
    access_key_id VARCHAR(255) NOT NULL,
    secret_access_key VARCHAR(255) NOT NULL,
    region VARCHAR(50) DEFAULT 'us-east-1',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_scan_targets_enabled ON scan_targets(enabled);
CREATE INDEX IF NOT EXISTS idx_scan_results_target_id ON scan_results(target_id);
CREATE INDEX IF NOT EXISTS idx_scan_results_ip_address ON scan_results(ip_address);
CREATE INDEX IF NOT EXISTS idx_scan_results_scanned_at ON scan_results(scanned_at);
CREATE INDEX IF NOT EXISTS idx_scan_sessions_started_at ON scan_sessions(started_at);
