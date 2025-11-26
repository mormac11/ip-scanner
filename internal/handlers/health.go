package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
)

type HealthResponse struct {
	Status   string `json:"status"`
	Database string `json:"database"`
}

func HealthCheck(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		response := HealthResponse{
			Status:   "healthy",
			Database: "disconnected",
		}

		// Check database connection
		if err := db.Ping(); err == nil {
			response.Database = "connected"
		}

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(response)
	}
}
