package scheduler

import (
	"database/sql"
	"fmt"
	"log"
	"sync"
	"time"

	"ip-scanner/internal/scanner"
)

type Scheduler struct {
	db          *sql.DB
	interval    time.Duration
	stopCh      chan struct{}
	wg          sync.WaitGroup
	scanning    bool
	scanningMux sync.RWMutex
	manualScan  chan struct{}
}

type portVerification struct {
	targetID  int
	ip        string
	port      int
	timestamp time.Time
}

func NewScheduler(db *sql.DB, interval time.Duration) *Scheduler {
	return &Scheduler{
		db:         db,
		interval:   interval,
		stopCh:     make(chan struct{}),
		manualScan: make(chan struct{}, 1),
	}
}

// Start begins the scheduled scanning
func (s *Scheduler) Start() {
	s.wg.Add(1)
	go s.run()
	log.Printf("Scheduler started with interval: %v", s.interval)
}

// Stop gracefully stops the scheduler
func (s *Scheduler) Stop() {
	close(s.stopCh)
	s.wg.Wait()
	log.Println("Scheduler stopped")
}

func (s *Scheduler) run() {
	defer s.wg.Done()

	// Run first scan immediately
	s.performScan()

	ticker := time.NewTicker(s.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			s.performScan()
		case <-s.manualScan:
			log.Println("Manual scan triggered")
			s.performScan()
		case <-s.stopCh:
			return
		}
	}
}

// IsScanning returns true if a scan is currently in progress
func (s *Scheduler) IsScanning() bool {
	s.scanningMux.RLock()
	defer s.scanningMux.RUnlock()
	return s.scanning
}

// TriggerScan manually triggers a scan (non-blocking)
func (s *Scheduler) TriggerScan() bool {
	select {
	case s.manualScan <- struct{}{}:
		return true
	default:
		// Scan already queued or in progress
		return false
	}
}

func (s *Scheduler) performScan() {
	// Set scanning flag
	s.scanningMux.Lock()
	s.scanning = true
	s.scanningMux.Unlock()

	defer func() {
		s.scanningMux.Lock()
		s.scanning = false
		s.scanningMux.Unlock()
	}()

	log.Println("Starting scheduled scan...")

	// Create scan session
	var sessionID int
	err := s.db.QueryRow(`
		INSERT INTO scan_sessions (started_at, status)
		VALUES (NOW(), 'running')
		RETURNING id
	`).Scan(&sessionID)
	if err != nil {
		log.Printf("Failed to create scan session: %v", err)
		return
	}

	// Get all enabled targets
	rows, err := s.db.Query(`
		SELECT id, target
		FROM scan_targets
		WHERE enabled = true
	`)
	if err != nil {
		log.Printf("Failed to fetch targets: %v", err)
		s.markSessionFailed(sessionID)
		return
	}
	defer rows.Close()

	type target struct {
		id     int
		target string
	}

	targets := []target{}
	for rows.Next() {
		var t target
		if err := rows.Scan(&t.id, &t.target); err != nil {
			log.Printf("Failed to scan target row: %v", err)
			continue
		}
		targets = append(targets, t)
	}

	if len(targets) == 0 {
		log.Println("No enabled targets found")
		s.markSessionCompleted(sessionID, 0, 0)
		return
	}

	log.Printf("Scanning %d targets...", len(targets))

	totalTargets := 0
	totalPorts := 0

	// Use a mutex to protect counters
	var mu sync.Mutex

	// Scan each target
	for _, t := range targets {
		ips, err := scanner.ParseCIDR(t.target)
		if err != nil {
			log.Printf("Failed to parse target %s: %v", t.target, err)
			continue
		}

		log.Printf("Scanning target %s (%d IPs)...", t.target, len(ips))

		// Use a worker pool to scan IPs in parallel
		// Create a channel for IP addresses
		ipChan := make(chan string, len(ips))
		for _, ip := range ips {
			ipChan <- ip
		}
		close(ipChan)

		// Create a wait group for workers
		var wg sync.WaitGroup
		numWorkers := 20 // Scan 20 IPs concurrently

		// Start worker goroutines
		for i := 0; i < numWorkers; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				for ip := range ipChan {
					// Use parallel port scanning
					results := scanner.ScanIPParallel(ip, scanner.CommonPorts, 2*time.Second)

					// Store results in database
					for _, result := range results {
						// Check for previous scan result to detect changes
						var previousStatus string
						err := s.db.QueryRow(`
							SELECT status FROM scan_results
							WHERE target_id = $1 AND ip_address = $2 AND port = $3
							ORDER BY scanned_at DESC
							LIMIT 1
						`, t.id, result.IP, result.Port).Scan(&previousStatus)

						// Store the new scan result
						_, err = s.db.Exec(`
							INSERT INTO scan_results (target_id, ip_address, port, status, response_time_ms, scanned_at)
							VALUES ($1, $2, $3, $4, $5, NOW())
						`, t.id, result.IP, result.Port, result.Status, result.ResponseTimeMs)

						if err != nil {
							log.Printf("Failed to store scan result: %v", err)
						} else {
							mu.Lock()
							totalPorts++
							mu.Unlock()

							// Create notification if port status changed
							if previousStatus == "closed" && result.Status == "open" {
								// Port opened - notify immediately
								s.createNotification(t.id, result.IP, result.Port, "new_port")
							} else if previousStatus == "open" && result.Status == "closed" {
								// Port closed - schedule verification in 1 minute
								s.schedulePortVerification(t.id, result.IP, result.Port)
							}
						}
					}

					mu.Lock()
					totalTargets++
					mu.Unlock()
				}
			}()
		}

		// Wait for all workers to complete
		wg.Wait()
	}

	// Mark session as completed
	s.markSessionCompleted(sessionID, totalTargets, totalPorts)

	log.Printf("Scan completed: %d IPs scanned, %d ports checked", totalTargets, totalPorts)
}

func (s *Scheduler) markSessionCompleted(sessionID, targets, ports int) {
	_, err := s.db.Exec(`
		UPDATE scan_sessions
		SET completed_at = NOW(), targets_scanned = $1, ports_scanned = $2, status = 'completed'
		WHERE id = $3
	`, targets, ports, sessionID)
	if err != nil {
		log.Printf("Failed to update scan session: %v", err)
	}
}

func (s *Scheduler) markSessionFailed(sessionID int) {
	_, err := s.db.Exec(`
		UPDATE scan_sessions
		SET completed_at = NOW(), status = 'failed'
		WHERE id = $1
	`, sessionID)
	if err != nil {
		log.Printf("Failed to update scan session: %v", err)
	}
}

// schedulePortVerification schedules a re-check of a specific port after 1 minute
func (s *Scheduler) schedulePortVerification(targetID int, ip string, port int) {
	log.Printf("Scheduling verification for %s:%d in 1 minute", ip, port)

	time.AfterFunc(1*time.Minute, func() {
		log.Printf("Verifying port closure for %s:%d", ip, port)

		// Re-scan just this specific port
		result := scanner.ScanPort(ip, port, 2*time.Second)

		if result.Status == "closed" {
			// Port is still closed after verification, create notification
			log.Printf("Verification confirmed: %s:%d is still closed", ip, port)
			s.createNotification(targetID, ip, port, "port_closed")
		} else {
			// Port reopened, log but don't notify
			log.Printf("Verification failed: %s:%d reopened, not recording closure", ip, port)
		}
	})
}

func (s *Scheduler) createNotification(targetID int, ip string, port int, notificationType string) {
	var title, message, severity string

	switch notificationType {
	case "new_port":
		title = "New Open Port Detected"
		message = fmt.Sprintf("Port %d is now open on %s", port, ip)
		severity = "warning"
	case "port_closed":
		title = "Port Closed"
		message = fmt.Sprintf("Port %d is now closed on %s (verified)", port, ip)
		severity = "info"
	default:
		return
	}

	_, err := s.db.Exec(`
		INSERT INTO notifications (type, title, message, severity, ip_address, port, target_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, notificationType, title, message, severity, ip, port, targetID)

	if err != nil {
		log.Printf("Failed to create notification: %v", err)
	} else {
		log.Printf("Created notification: %s for %s:%d", notificationType, ip, port)
	}
}
