package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"

	"ip-scanner/internal/models"
	"ip-scanner/internal/scanner"

	"github.com/gorilla/mux"
)

type TargetHandler struct {
	db *sql.DB
}

func NewTargetHandler(db *sql.DB) *TargetHandler {
	return &TargetHandler{db: db}
}

// CreateTarget handles POST /api/v1/targets
func (h *TargetHandler) CreateTarget(w http.ResponseWriter, r *http.Request) {
	var req models.CreateTargetRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate the target (IP or CIDR)
	_, err := scanner.ParseCIDR(req.Target)
	if err != nil {
		http.Error(w, "Invalid IP address or CIDR notation", http.StatusBadRequest)
		return
	}

	// Insert into database
	var target models.ScanTarget
	err = h.db.QueryRow(`
		INSERT INTO scan_targets (target, description, enabled)
		VALUES ($1, $2, true)
		RETURNING id, target, description, enabled, created_at, updated_at
	`, req.Target, req.Description).Scan(
		&target.ID, &target.Target, &target.Description,
		&target.Enabled, &target.CreatedAt, &target.UpdatedAt,
	)

	if err != nil {
		http.Error(w, "Failed to create target: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(target)
}

// ListTargets handles GET /api/v1/targets
func (h *TargetHandler) ListTargets(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.Query(`
		SELECT id, target, description, enabled, created_at, updated_at
		FROM scan_targets
		ORDER BY created_at DESC
	`)
	if err != nil {
		http.Error(w, "Failed to fetch targets", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	targets := []models.ScanTarget{}
	for rows.Next() {
		var target models.ScanTarget
		err := rows.Scan(
			&target.ID, &target.Target, &target.Description,
			&target.Enabled, &target.CreatedAt, &target.UpdatedAt,
		)
		if err != nil {
			http.Error(w, "Failed to parse targets", http.StatusInternalServerError)
			return
		}
		targets = append(targets, target)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(targets)
}

// DeleteTarget handles DELETE /api/v1/targets/{id}
func (h *TargetHandler) DeleteTarget(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid target ID", http.StatusBadRequest)
		return
	}

	result, err := h.db.Exec("DELETE FROM scan_targets WHERE id = $1", id)
	if err != nil {
		http.Error(w, "Failed to delete target", http.StatusInternalServerError)
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		http.Error(w, "Target not found", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// ToggleTarget handles PUT /api/v1/targets/{id}/toggle
func (h *TargetHandler) ToggleTarget(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid target ID", http.StatusBadRequest)
		return
	}

	var target models.ScanTarget
	err = h.db.QueryRow(`
		UPDATE scan_targets
		SET enabled = NOT enabled, updated_at = NOW()
		WHERE id = $1
		RETURNING id, target, description, enabled, created_at, updated_at
	`, id).Scan(
		&target.ID, &target.Target, &target.Description,
		&target.Enabled, &target.CreatedAt, &target.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		http.Error(w, "Target not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Failed to toggle target", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(target)
}
