package handlers

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"

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
// Returns all configured AWS accounts
func (h *AWSHandler) GetCredentials(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.Query(`
		SELECT id, account_name, access_key_id, region, created_at, updated_at
		FROM aws_credentials
		ORDER BY account_name ASC
	`)
	if err != nil {
		http.Error(w, "Failed to fetch credentials: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var credentials []models.AWSCredentialsResponse
	for rows.Next() {
		var cred models.AWSCredentialsResponse
		err := rows.Scan(&cred.ID, &cred.AccountName, &cred.AccessKeyID, &cred.Region, &cred.CreatedAt, &cred.UpdatedAt)
		if err != nil {
			http.Error(w, "Failed to scan credentials: "+err.Error(), http.StatusInternalServerError)
			return
		}
		credentials = append(credentials, cred)
	}

	if credentials == nil {
		credentials = []models.AWSCredentialsResponse{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(credentials)
}

// SaveCredentials handles POST /api/v1/aws/credentials
// Creates a new AWS account configuration
func (h *AWSHandler) SaveCredentials(w http.ResponseWriter, r *http.Request) {
	var req models.AWSCredentialsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate required fields
	if req.AccountName == "" {
		http.Error(w, "Account name is required", http.StatusBadRequest)
		return
	}
	if req.AccessKeyID == "" || req.SecretAccessKey == "" {
		http.Error(w, "Access key ID and secret access key are required", http.StatusBadRequest)
		return
	}

	if req.Region == "" {
		req.Region = "us-east-1"
	}

	// Insert new credentials
	var creds models.AWSCredentialsResponse
	err := h.db.QueryRow(`
		INSERT INTO aws_credentials (account_name, access_key_id, secret_access_key, region)
		VALUES ($1, $2, $3, $4)
		RETURNING id, account_name, access_key_id, region, created_at, updated_at
	`, req.AccountName, req.AccessKeyID, req.SecretAccessKey, req.Region).Scan(
		&creds.ID, &creds.AccountName, &creds.AccessKeyID, &creds.Region, &creds.CreatedAt, &creds.UpdatedAt,
	)

	if err != nil {
		// Check for unique constraint violation
		if err.Error() == "pq: duplicate key value violates unique constraint \"aws_credentials_account_name_unique\"" {
			http.Error(w, "An account with this name already exists", http.StatusConflict)
			return
		}
		http.Error(w, "Failed to save credentials: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(creds)
}

// UpdateCredentials handles PUT /api/v1/aws/credentials/{id}
// Updates an existing AWS account configuration
func (h *AWSHandler) UpdateCredentials(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]

	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid account ID", http.StatusBadRequest)
		return
	}

	var req models.AWSCredentialsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate required fields
	if req.AccountName == "" {
		http.Error(w, "Account name is required", http.StatusBadRequest)
		return
	}
	if req.AccessKeyID == "" || req.SecretAccessKey == "" {
		http.Error(w, "Access key ID and secret access key are required", http.StatusBadRequest)
		return
	}

	if req.Region == "" {
		req.Region = "us-east-1"
	}

	// Update credentials
	var creds models.AWSCredentialsResponse
	err = h.db.QueryRow(`
		UPDATE aws_credentials
		SET account_name = $1, access_key_id = $2, secret_access_key = $3, region = $4, updated_at = CURRENT_TIMESTAMP
		WHERE id = $5
		RETURNING id, account_name, access_key_id, region, created_at, updated_at
	`, req.AccountName, req.AccessKeyID, req.SecretAccessKey, req.Region, id).Scan(
		&creds.ID, &creds.AccountName, &creds.AccessKeyID, &creds.Region, &creds.CreatedAt, &creds.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Account not found", http.StatusNotFound)
			return
		}
		// Check for unique constraint violation
		if err.Error() == "pq: duplicate key value violates unique constraint \"aws_credentials_account_name_unique\"" {
			http.Error(w, "An account with this name already exists", http.StatusConflict)
			return
		}
		http.Error(w, "Failed to update credentials: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(creds)
}

// DeleteCredentials handles DELETE /api/v1/aws/credentials/{id}
// Deletes a specific AWS account configuration
func (h *AWSHandler) DeleteCredentials(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]

	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid account ID", http.StatusBadRequest)
		return
	}

	result, err := h.db.Exec("DELETE FROM aws_credentials WHERE id = $1", id)
	if err != nil {
		http.Error(w, "Failed to delete credentials", http.StatusInternalServerError)
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		http.Error(w, "Account not found", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// SyncAWS handles POST /api/v1/aws/sync
// Fetches public IPs from all configured AWS accounts and manages targets
func (h *AWSHandler) SyncAWS(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()

	// Get all stored credentials
	rows, err := h.db.Query(`
		SELECT id, account_name, access_key_id, secret_access_key, region
		FROM aws_credentials
		ORDER BY account_name ASC
	`)
	if err != nil {
		http.Error(w, "Failed to fetch credentials: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var allCredentials []models.AWSCredentials
	for rows.Next() {
		var cred models.AWSCredentials
		err := rows.Scan(&cred.ID, &cred.AccountName, &cred.AccessKeyID, &cred.SecretAccessKey, &cred.Region)
		if err != nil {
			http.Error(w, "Failed to scan credentials: "+err.Error(), http.StatusInternalServerError)
			return
		}
		allCredentials = append(allCredentials, cred)
	}

	if len(allCredentials) == 0 {
		http.Error(w, "No AWS credentials configured. Please configure credentials first.", http.StatusBadRequest)
		return
	}

	// Collect all public IPs from all accounts
	allPublicIPs := make(map[string]string) // ip -> account_name

	for _, cred := range allCredentials {
		// Create EC2 service with stored credentials
		ec2Svc, err := awsService.NewEC2ServiceWithCredentials(ctx, cred.AccessKeyID, cred.SecretAccessKey, cred.Region)
		if err != nil {
			// Log error but continue with other accounts
			continue
		}

		// Fetch public IPs
		publicIPs, err := ec2Svc.GetPublicIPs(ctx)
		if err != nil {
			// Log error but continue with other accounts
			continue
		}

		for _, ip := range publicIPs {
			allPublicIPs[ip] = cred.AccountName
		}
	}

	// Get existing AWS-imported targets
	existingTargets := make(map[string]int) // ip -> target_id
	targetRows, err := h.db.Query(`
		SELECT id, target FROM scan_targets
		WHERE description LIKE 'Auto-imported from AWS%'
	`)
	if err == nil {
		defer targetRows.Close()
		for targetRows.Next() {
			var id int
			var target string
			if err := targetRows.Scan(&id, &target); err == nil {
				existingTargets[target] = id
			}
		}
	}

	// Add new targets and update existing
	added := 0
	for ip, accountName := range allPublicIPs {
		description := "Auto-imported from AWS EC2 (" + accountName + ")"

		if _, exists := existingTargets[ip]; exists {
			// Update description if exists
			h.db.Exec("UPDATE scan_targets SET description = $1 WHERE target = $2", description, ip)
			delete(existingTargets, ip) // Remove from list to not delete later
		} else {
			// Insert new target
			_, err = h.db.Exec(`
				INSERT INTO scan_targets (target, description, enabled)
				VALUES ($1, $2, true)
			`, ip, description)
			if err == nil {
				added++
			}
		}
	}

	// Remove targets that no longer exist in any AWS account
	removed := 0
	for _, targetID := range existingTargets {
		_, err := h.db.Exec("DELETE FROM scan_targets WHERE id = $1", targetID)
		if err == nil {
			removed++
		}
	}

	response := map[string]interface{}{
		"total_aws_ips": len(allPublicIPs),
		"added":         added,
		"removed":       removed,
		"accounts":      len(allCredentials),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
