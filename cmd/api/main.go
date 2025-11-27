package main

import (
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"ip-scanner/internal/database"
	"ip-scanner/internal/handlers"
	"ip-scanner/internal/middleware"
	"ip-scanner/internal/scheduler"

	"github.com/gorilla/mux"
	_ "github.com/lib/pq"
)

func main() {
	// Database connection
	db, err := database.Connect()
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	// Initialize router
	router := mux.NewRouter()

	// Start the scheduler for periodic scans (every 15 minutes)
	scanScheduler := scheduler.NewScheduler(db, 15*time.Minute)
	scanScheduler.Start()

	// Start the AWS sync scheduler (every 1 hour)
	awsScheduler := scheduler.NewAWSScheduler(db, 1*time.Hour)
	awsScheduler.Start()

	// Initialize handlers
	targetHandler := handlers.NewTargetHandler(db)
	resultsHandler := handlers.NewResultsHandler(db)
	awsHandler := handlers.NewAWSHandler(db)
	notificationHandler := handlers.NewNotificationHandler(db)
	scanHandler := handlers.NewScanHandler(scanScheduler)

	// Health check endpoint
	router.HandleFunc("/health", handlers.HealthCheck(db)).Methods("GET")

	// API routes
	api := router.PathPrefix("/api/v1").Subrouter()

	// Apply JWT authentication middleware to all API routes
	api.Use(middleware.JWTAuthMiddleware)

	api.HandleFunc("/status", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status": "ok", "service": "ip-scanner"}`))
	}).Methods("GET")

	// Target management endpoints
	api.HandleFunc("/targets", targetHandler.ListTargets).Methods("GET")
	api.HandleFunc("/targets", targetHandler.CreateTarget).Methods("POST")
	api.HandleFunc("/targets/{id}", targetHandler.DeleteTarget).Methods("DELETE")
	api.HandleFunc("/targets/{id}/toggle", targetHandler.ToggleTarget).Methods("PUT")

	// Scan results endpoints
	api.HandleFunc("/results/latest", resultsHandler.GetLatestResults).Methods("GET")
	api.HandleFunc("/results/open", resultsHandler.GetOpenPorts).Methods("GET")
	api.HandleFunc("/results/ip", resultsHandler.GetResultsByIP).Methods("GET")
	api.HandleFunc("/results/sessions", resultsHandler.GetScanSessions).Methods("GET")
	api.HandleFunc("/results/changes", resultsHandler.GetChangeHistory).Methods("GET")

	// AWS integration endpoints
	api.HandleFunc("/aws/credentials", awsHandler.GetCredentials).Methods("GET")
	api.HandleFunc("/aws/credentials", awsHandler.SaveCredentials).Methods("POST")
	api.HandleFunc("/aws/credentials/{id}", awsHandler.UpdateCredentials).Methods("PUT")
	api.HandleFunc("/aws/credentials/{id}", awsHandler.DeleteCredentials).Methods("DELETE")
	api.HandleFunc("/aws/sync", awsHandler.SyncAWS).Methods("POST")

	// Notification endpoints
	api.HandleFunc("/notifications", notificationHandler.GetNotifications).Methods("GET")
	api.HandleFunc("/notifications/unread/count", notificationHandler.GetUnreadCount).Methods("GET")
	api.HandleFunc("/notifications/{id}/read", notificationHandler.MarkAsRead).Methods("PUT")
	api.HandleFunc("/notifications/read-all", notificationHandler.MarkAllAsRead).Methods("PUT")
	api.HandleFunc("/notifications/{id}", notificationHandler.DeleteNotification).Methods("DELETE")
	api.HandleFunc("/notifications/read", notificationHandler.DeleteAllRead).Methods("DELETE")

	// Scan endpoints
	api.HandleFunc("/scan/status", scanHandler.GetStatus).Methods("GET")
	api.HandleFunc("/scan/trigger", scanHandler.TriggerScan).Methods("POST")

	// CORS middleware for future React frontend
	router.Use(corsMiddleware)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	server := &http.Server{
		Handler:      router,
		Addr:         ":" + port,
		WriteTimeout: 15 * time.Second,
		ReadTimeout:  15 * time.Second,
	}

	// Handle graceful shutdown
	go func() {
		sigint := make(chan os.Signal, 1)
		signal.Notify(sigint, os.Interrupt, syscall.SIGTERM)
		<-sigint

		log.Println("Shutting down server...")
		scanScheduler.Stop()
		awsScheduler.Stop()
		server.Close()
	}()

	log.Printf("Server starting on port %s", port)
	log.Printf("Scheduler running - scans every 15 minutes")
	log.Printf("AWS sync running - syncs every 1 hour")
	log.Fatal(server.ListenAndServe())
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}
