package handlers

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"

	awsService "ip-scanner/internal/aws"
	"ip-scanner/internal/models"
)

type AWSHandler struct {
	db *sql.DB
}

func NewAWSHandler(db *sql.DB) *AWSHandler {
	return &AWSHandler{db: db}
}

// GetCredentials handles GET /api/v1/aws/credentials
func (h *AWSHandler) GetCredentials(w http.ResponseWriter, r *http.Request) {
	var creds models.AWSCredentialsResponse

	err := h.db.QueryRow(`
		SELECT id, access_key_id, region, created_at, updated_at
		FROM aws_credentials
		ORDER BY id DESC
		LIMIT 1
	`).Scan(&creds.ID, &creds.AccessKeyID, &creds.Region, &creds.CreatedAt, &creds.UpdatedAt)

	if err == sql.ErrNoRows {
		creds.IsConfigured = false
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(creds)
		return
	}

	if err != nil {
		http.Error(w, "Failed to fetch credentials: "+err.Error(), http.StatusInternalServerError)
		return
	}

	creds.IsConfigured = true
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(creds)
}

// SaveCredentials handles POST /api/v1/aws/credentials
func (h *AWSHandler) SaveCredentials(w http.ResponseWriter, r *http.Request) {
	var req models.AWSCredentialsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate required fields
	if req.AccessKeyID == "" || req.SecretAccessKey == "" {
		http.Error(w, "Access key ID and secret access key are required", http.StatusBadRequest)
		return
	}

	if req.Region == "" {
		req.Region = "us-east-1"
	}

	// Delete existing credentials (we only store one set)
	_, err := h.db.Exec("DELETE FROM aws_credentials")
	if err != nil {
		http.Error(w, "Failed to clear old credentials", http.StatusInternalServerError)
		return
	}

	// Insert new credentials
	var creds models.AWSCredentialsResponse
	err = h.db.QueryRow(`
		INSERT INTO aws_credentials (access_key_id, secret_access_key, region)
		VALUES ($1, $2, $3)
		RETURNING id, access_key_id, region, created_at, updated_at
	`, req.AccessKeyID, req.SecretAccessKey, req.Region).Scan(
		&creds.ID, &creds.AccessKeyID, &creds.Region, &creds.CreatedAt, &creds.UpdatedAt,
	)

	if err != nil {
		http.Error(w, "Failed to save credentials: "+err.Error(), http.StatusInternalServerError)
		return
	}

	creds.IsConfigured = true
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(creds)
}

// DeleteCredentials handles DELETE /api/v1/aws/credentials
func (h *AWSHandler) DeleteCredentials(w http.ResponseWriter, r *http.Request) {
	result, err := h.db.Exec("DELETE FROM aws_credentials")
	if err != nil {
		http.Error(w, "Failed to delete credentials", http.StatusInternalServerError)
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		http.Error(w, "No credentials found", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// SyncAWS handles POST /api/v1/aws/sync
// Fetches public IPs from EC2 and adds them as targets
func (h *AWSHandler) SyncAWS(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()

	// Get stored credentials
	var accessKeyID, secretAccessKey, region string
	err := h.db.QueryRow(`
		SELECT access_key_id, secret_access_key, region
		FROM aws_credentials
		ORDER BY id DESC
		LIMIT 1
	`).Scan(&accessKeyID, &secretAccessKey, &region)

	if err == sql.ErrNoRows {
		http.Error(w, "AWS credentials not configured. Please configure credentials first.", http.StatusBadRequest)
		return
	}

	if err != nil {
		http.Error(w, "Failed to fetch credentials: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Create EC2 service with stored credentials
	ec2Svc, err := awsService.NewEC2ServiceWithCredentials(ctx, accessKeyID, secretAccessKey, region)
	if err != nil {
		http.Error(w, "Failed to initialize AWS service: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Fetch public IPs
	publicIPs, err := ec2Svc.GetPublicIPs(ctx)
	if err != nil {
		http.Error(w, "Failed to fetch EC2 public IPs: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Add each IP as a target (skip duplicates)
	added := 0
	skipped := 0

	for _, ip := range publicIPs {
		// Check if target already exists
		var exists bool
		err := h.db.QueryRow("SELECT EXISTS(SELECT 1 FROM scan_targets WHERE target = $1)", ip).Scan(&exists)
		if err != nil {
			continue
		}

		if exists {
			skipped++
			continue
		}

		// Insert new target
		_, err = h.db.Exec(`
			INSERT INTO scan_targets (target, description, enabled)
			VALUES ($1, $2, true)
		`, ip, "Auto-imported from AWS EC2")

		if err != nil {
			skipped++
			continue
		}

		added++
	}

	response := map[string]interface{}{
		"total":   len(publicIPs),
		"added":   added,
		"skipped": skipped,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
