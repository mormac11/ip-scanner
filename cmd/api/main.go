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
	// "ip-scanner/internal/middleware" // DISABLED: Uncomment to enable authentication
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

	// Initialize handlers
	targetHandler := handlers.NewTargetHandler(db)
	resultsHandler := handlers.NewResultsHandler(db)
	awsHandler := handlers.NewAWSHandler(db)

	// Health check endpoint
	router.HandleFunc("/health", handlers.HealthCheck(db)).Methods("GET")

	// API routes
	api := router.PathPrefix("/api/v1").Subrouter()

	// Apply JWT authentication middleware to all API routes
	// DISABLED: Uncomment the line below to enable Azure AD authentication
	// api.Use(middleware.JWTAuthMiddleware)

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

	// AWS integration endpoints
	api.HandleFunc("/aws/credentials", awsHandler.GetCredentials).Methods("GET")
	api.HandleFunc("/aws/credentials", awsHandler.SaveCredentials).Methods("POST")
	api.HandleFunc("/aws/credentials", awsHandler.DeleteCredentials).Methods("DELETE")
	api.HandleFunc("/aws/sync", awsHandler.SyncAWS).Methods("POST")

	// CORS middleware for future React frontend
	router.Use(corsMiddleware)

	// Start the scheduler for periodic scans (every 15 minutes)
	scanScheduler := scheduler.NewScheduler(db, 15*time.Minute)
	scanScheduler.Start()

	// Start the AWS sync scheduler (every 1 hour)
	awsScheduler := scheduler.NewAWSScheduler(db, 1*time.Hour)
	awsScheduler.Start()

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
