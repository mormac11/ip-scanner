package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"ip-scanner/internal/models"
)

type ResultsHandler struct {
	db *sql.DB
}

func NewResultsHandler(db *sql.DB) *ResultsHandler {
	return &ResultsHandler{db: db}
}

// GetLatestResults handles GET /api/v1/results/latest
func (h *ResultsHandler) GetLatestResults(w http.ResponseWriter, r *http.Request) {
	// Get the most recent scan results for each IP/port combination
	rows, err := h.db.Query(`
		WITH latest_scans AS (
			SELECT DISTINCT ON (ip_address, port)
				sr.id, sr.target_id, sr.ip_address, sr.port,
				sr.status, sr.scanned_at, sr.response_time_ms,
				st.description as target_description
			FROM scan_results sr
			JOIN scan_targets st ON sr.target_id = st.id
			ORDER BY ip_address, port, scanned_at DESC
		),
		first_seen AS (
			SELECT ip_address, port, MIN(scanned_at) as first_discovered_at
			FROM scan_results
			WHERE status = 'open'
			GROUP BY ip_address, port
		)
		SELECT ls.id, ls.target_id, ls.ip_address, ls.port, ls.status,
		       ls.scanned_at, ls.response_time_ms, ls.target_description,
		       fs.first_discovered_at
		FROM latest_scans ls
		LEFT JOIN first_seen fs ON ls.ip_address = fs.ip_address AND ls.port = fs.port
		ORDER BY ls.ip_address, ls.port
	`)
	if err != nil {
		http.Error(w, "Failed to fetch results: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	results := []models.ScanResultWithTarget{}
	for rows.Next() {
		var result models.ScanResultWithTarget
		err := rows.Scan(
			&result.ID, &result.TargetID, &result.IPAddress, &result.Port,
			&result.Status, &result.ScannedAt, &result.ResponseTimeMs,
			&result.TargetDescription, &result.FirstDiscoveredAt,
		)
		if err != nil {
			http.Error(w, "Failed to parse results", http.StatusInternalServerError)
			return
		}
		results = append(results, result)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(results)
}

// GetResultsByIP handles GET /api/v1/results/ip/{ip}
func (h *ResultsHandler) GetResultsByIP(w http.ResponseWriter, r *http.Request) {
	ip := r.URL.Query().Get("ip")
	if ip == "" {
		http.Error(w, "IP address is required", http.StatusBadRequest)
		return
	}

	rows, err := h.db.Query(`
		SELECT sr.id, sr.target_id, sr.ip_address, sr.port,
			   sr.status, sr.scanned_at, sr.response_time_ms,
			   st.description as target_description
		FROM scan_results sr
		JOIN scan_targets st ON sr.target_id = st.id
		WHERE sr.ip_address = $1
		ORDER BY sr.scanned_at DESC, sr.port
		LIMIT 100
	`, ip)
	if err != nil {
		http.Error(w, "Failed to fetch results", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	results := []models.ScanResultWithTarget{}
	for rows.Next() {
		var result models.ScanResultWithTarget
		err := rows.Scan(
			&result.ID, &result.TargetID, &result.IPAddress, &result.Port,
			&result.Status, &result.ScannedAt, &result.ResponseTimeMs,
			&result.TargetDescription,
		)
		if err != nil {
			http.Error(w, "Failed to parse results", http.StatusInternalServerError)
			return
		}
		results = append(results, result)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(results)
}

// GetOpenPorts handles GET /api/v1/results/open
func (h *ResultsHandler) GetOpenPorts(w http.ResponseWriter, r *http.Request) {
	// Get only open ports from the latest scan
	rows, err := h.db.Query(`
		WITH latest_scans AS (
			SELECT DISTINCT ON (ip_address, port)
				sr.id, sr.target_id, sr.ip_address, sr.port,
				sr.status, sr.scanned_at, sr.response_time_ms,
				st.description as target_description
			FROM scan_results sr
			JOIN scan_targets st ON sr.target_id = st.id
			ORDER BY ip_address, port, scanned_at DESC
		),
		first_seen AS (
			SELECT ip_address, port, MIN(scanned_at) as first_discovered_at
			FROM scan_results
			WHERE status = 'open'
			GROUP BY ip_address, port
		)
		SELECT ls.id, ls.target_id, ls.ip_address, ls.port, ls.status,
		       ls.scanned_at, ls.response_time_ms, ls.target_description,
		       fs.first_discovered_at
		FROM latest_scans ls
		LEFT JOIN first_seen fs ON ls.ip_address = fs.ip_address AND ls.port = fs.port
		WHERE ls.status = 'open'
		ORDER BY ls.ip_address, ls.port
	`)
	if err != nil {
		http.Error(w, "Failed to fetch results", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	results := []models.ScanResultWithTarget{}
	for rows.Next() {
		var result models.ScanResultWithTarget
		err := rows.Scan(
			&result.ID, &result.TargetID, &result.IPAddress, &result.Port,
			&result.Status, &result.ScannedAt, &result.ResponseTimeMs,
			&result.TargetDescription, &result.FirstDiscoveredAt,
		)
		if err != nil {
			http.Error(w, "Failed to parse results", http.StatusInternalServerError)
			return
		}
		results = append(results, result)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(results)
}

// GetScanSessions handles GET /api/v1/results/sessions
func (h *ResultsHandler) GetScanSessions(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.Query(`
		SELECT id, started_at, completed_at, targets_scanned, ports_scanned, status
		FROM scan_sessions
		ORDER BY started_at DESC
		LIMIT 50
	`)
	if err != nil {
		http.Error(w, "Failed to fetch sessions", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	sessions := []models.ScanSession{}
	for rows.Next() {
		var session models.ScanSession
		err := rows.Scan(
			&session.ID, &session.StartedAt, &session.CompletedAt,
			&session.TargetsScanned, &session.PortsScanned, &session.Status,
		)
		if err != nil {
			http.Error(w, "Failed to parse sessions", http.StatusInternalServerError)
			return
		}
		sessions = append(sessions, session)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(sessions)
}

// PortChange represents a detected change in port status
type PortChange struct {
	IPAddress       string    `json:"ip_address"`
	Port            int       `json:"port"`
	PreviousStatus  string    `json:"previous_status"`
	NewStatus       string    `json:"new_status"`
	ChangeType      string    `json:"change_type"` // "opened" or "closed"
	DetectedAt      string    `json:"detected_at"`
	TargetID        int       `json:"target_id"`
	TargetDesc      string    `json:"target_description"`
}

// GetChangeHistory handles GET /api/v1/results/changes
func (h *ResultsHandler) GetChangeHistory(w http.ResponseWriter, r *http.Request) {
	// Query to detect all port status changes
	rows, err := h.db.Query(`
		WITH ranked_results AS (
			SELECT
				sr.ip_address,
				sr.port,
				sr.status,
				sr.scanned_at,
				sr.target_id,
				st.description as target_description,
				LAG(sr.status) OVER (PARTITION BY sr.ip_address, sr.port ORDER BY sr.scanned_at) as previous_status
			FROM scan_results sr
			JOIN scan_targets st ON sr.target_id = st.id
			ORDER BY sr.scanned_at DESC
		)
		SELECT
			ip_address,
			port,
			previous_status,
			status as new_status,
			CASE
				WHEN previous_status = 'closed' AND status = 'open' THEN 'opened'
				WHEN previous_status = 'open' AND status = 'closed' THEN 'closed'
				ELSE 'unknown'
			END as change_type,
			scanned_at,
			target_id,
			target_description
		FROM ranked_results
		WHERE previous_status IS NOT NULL
		  AND previous_status != status
		ORDER BY scanned_at DESC
		LIMIT 200
	`)
	if err != nil {
		http.Error(w, "Failed to fetch change history: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	changes := []PortChange{}
	for rows.Next() {
		var change PortChange
		var previousStatus sql.NullString

		err := rows.Scan(
			&change.IPAddress,
			&change.Port,
			&previousStatus,
			&change.NewStatus,
			&change.ChangeType,
			&change.DetectedAt,
			&change.TargetID,
			&change.TargetDesc,
		)
		if err != nil {
			http.Error(w, "Failed to parse change history: "+err.Error(), http.StatusInternalServerError)
			return
		}

		if previousStatus.Valid {
			change.PreviousStatus = previousStatus.String
		}

		changes = append(changes, change)
	}

	if changes == nil {
		changes = []PortChange{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(changes)
}
