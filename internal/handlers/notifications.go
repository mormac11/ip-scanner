package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"

	"ip-scanner/internal/models"
)

type NotificationHandler struct {
	db *sql.DB
}

func NewNotificationHandler(db *sql.DB) *NotificationHandler {
	return &NotificationHandler{db: db}
}

// GetNotifications handles GET /api/v1/notifications
// Returns all notifications, optionally filtered by read status
func (h *NotificationHandler) GetNotifications(w http.ResponseWriter, r *http.Request) {
	unreadOnly := r.URL.Query().Get("unread_only") == "true"

	query := `
		SELECT id, type, title, message, severity, ip_address, port, target_id, is_read, created_at
		FROM notifications
	`

	if unreadOnly {
		query += " WHERE is_read = false"
	}

	query += " ORDER BY created_at DESC LIMIT 100"

	rows, err := h.db.Query(query)
	if err != nil {
		http.Error(w, "Failed to fetch notifications: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var notifications []models.Notification
	for rows.Next() {
		var notif models.Notification
		var ipAddress sql.NullString
		var port, targetID sql.NullInt64

		err := rows.Scan(
			&notif.ID,
			&notif.Type,
			&notif.Title,
			&notif.Message,
			&notif.Severity,
			&ipAddress,
			&port,
			&targetID,
			&notif.IsRead,
			&notif.CreatedAt,
		)
		if err != nil {
			http.Error(w, "Failed to scan notification: "+err.Error(), http.StatusInternalServerError)
			return
		}

		if ipAddress.Valid {
			notif.IPAddress = ipAddress.String
		}
		if port.Valid {
			portInt := int(port.Int64)
			notif.Port = &portInt
		}
		if targetID.Valid {
			targetIDInt := int(targetID.Int64)
			notif.TargetID = &targetIDInt
		}

		notifications = append(notifications, notif)
	}

	if notifications == nil {
		notifications = []models.Notification{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(notifications)
}

// GetUnreadCount handles GET /api/v1/notifications/unread/count
// Returns the count of unread notifications
func (h *NotificationHandler) GetUnreadCount(w http.ResponseWriter, r *http.Request) {
	var count int
	err := h.db.QueryRow(`
		SELECT COUNT(*) FROM notifications WHERE is_read = false
	`).Scan(&count)

	if err != nil {
		http.Error(w, "Failed to count unread notifications: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]int{"count": count})
}

// MarkAsRead handles PUT /api/v1/notifications/{id}/read
// Marks a specific notification as read
func (h *NotificationHandler) MarkAsRead(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]

	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid notification ID", http.StatusBadRequest)
		return
	}

	result, err := h.db.Exec(`
		UPDATE notifications SET is_read = true WHERE id = $1
	`, id)

	if err != nil {
		http.Error(w, "Failed to mark notification as read", http.StatusInternalServerError)
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		http.Error(w, "Notification not found", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// MarkAllAsRead handles PUT /api/v1/notifications/read-all
// Marks all notifications as read
func (h *NotificationHandler) MarkAllAsRead(w http.ResponseWriter, r *http.Request) {
	_, err := h.db.Exec(`
		UPDATE notifications SET is_read = true WHERE is_read = false
	`)

	if err != nil {
		http.Error(w, "Failed to mark all notifications as read", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// DeleteNotification handles DELETE /api/v1/notifications/{id}
// Deletes a specific notification
func (h *NotificationHandler) DeleteNotification(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]

	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid notification ID", http.StatusBadRequest)
		return
	}

	result, err := h.db.Exec("DELETE FROM notifications WHERE id = $1", id)
	if err != nil {
		http.Error(w, "Failed to delete notification", http.StatusInternalServerError)
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		http.Error(w, "Notification not found", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// DeleteAllRead handles DELETE /api/v1/notifications/read
// Deletes all read notifications
func (h *NotificationHandler) DeleteAllRead(w http.ResponseWriter, r *http.Request) {
	_, err := h.db.Exec("DELETE FROM notifications WHERE is_read = true")
	if err != nil {
		http.Error(w, "Failed to delete read notifications", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
