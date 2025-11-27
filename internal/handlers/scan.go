package handlers

import (
	"encoding/json"
	"net/http"

	"ip-scanner/internal/scheduler"
)

type ScanHandler struct {
	scheduler *scheduler.Scheduler
}

func NewScanHandler(s *scheduler.Scheduler) *ScanHandler {
	return &ScanHandler{
		scheduler: s,
	}
}

type ScanStatusResponse struct {
	Scanning bool `json:"scanning"`
}

type TriggerScanResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

// GetStatus returns the current scan status
func (h *ScanHandler) GetStatus(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	response := ScanStatusResponse{
		Scanning: h.scheduler.IsScanning(),
	}

	json.NewEncoder(w).Encode(response)
}

// TriggerScan manually triggers a scan
func (h *ScanHandler) TriggerScan(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	success := h.scheduler.TriggerScan()

	response := TriggerScanResponse{
		Success: success,
	}

	if success {
		response.Message = "Scan triggered successfully"
		w.WriteHeader(http.StatusOK)
	} else {
		response.Message = "Scan already in progress or queued"
		w.WriteHeader(http.StatusConflict)
	}

	json.NewEncoder(w).Encode(response)
}
