package models

import "time"

type ScanTarget struct {
	ID          int       `json:"id"`
	Target      string    `json:"target"`
	Description string    `json:"description"`
	Enabled     bool      `json:"enabled"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type ScanResult struct {
	ID             int       `json:"id"`
	TargetID       int       `json:"target_id"`
	IPAddress      string    `json:"ip_address"`
	Port           int       `json:"port"`
	Status         string    `json:"status"`
	ScannedAt      time.Time `json:"scanned_at"`
	ResponseTimeMs int       `json:"response_time_ms"`
}

type ScanSession struct {
	ID             int       `json:"id"`
	StartedAt      time.Time `json:"started_at"`
	CompletedAt    *time.Time `json:"completed_at,omitempty"`
	TargetsScanned int       `json:"targets_scanned"`
	PortsScanned   int       `json:"ports_scanned"`
	Status         string    `json:"status"`
}

type CreateTargetRequest struct {
	Target      string `json:"target"`
	Description string `json:"description"`
}

type ScanResultWithTarget struct {
	ScanResult
	TargetDescription string `json:"target_description"`
}

type AWSCredentials struct {
	ID              int       `json:"id"`
	AccessKeyID     string    `json:"access_key_id"`
	SecretAccessKey string    `json:"secret_access_key,omitempty"` // omit in responses for security
	Region          string    `json:"region"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type AWSCredentialsRequest struct {
	AccessKeyID     string `json:"access_key_id"`
	SecretAccessKey string `json:"secret_access_key"`
	Region          string `json:"region"`
}

type AWSCredentialsResponse struct {
	ID          int       `json:"id"`
	AccessKeyID string    `json:"access_key_id"`
	Region      string    `json:"region"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	IsConfigured bool     `json:"is_configured"`
}
