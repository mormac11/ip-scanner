package scheduler

import (
	"database/sql"
	"log"
	"sync"
	"time"

	"ip-scanner/internal/scanner"
)

type Scheduler struct {
	db       *sql.DB
	interval time.Duration
	stopCh   chan struct{}
	wg       sync.WaitGroup
}

func NewScheduler(db *sql.DB, interval time.Duration) *Scheduler {
	return &Scheduler{
		db:       db,
		interval: interval,
		stopCh:   make(chan struct{}),
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
		case <-s.stopCh:
			return
		}
	}
}

func (s *Scheduler) performScan() {
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

	// Scan each target
	for _, t := range targets {
		ips, err := scanner.ParseCIDR(t.target)
		if err != nil {
			log.Printf("Failed to parse target %s: %v", t.target, err)
			continue
		}

		log.Printf("Scanning target %s (%d IPs)...", t.target, len(ips))

		for _, ip := range ips {
			results := scanner.ScanIP(ip, scanner.CommonPorts, 2*time.Second)

			// Store results in database
			for _, result := range results {
				_, err := s.db.Exec(`
					INSERT INTO scan_results (target_id, ip_address, port, status, response_time_ms, scanned_at)
					VALUES ($1, $2, $3, $4, $5, NOW())
				`, t.id, result.IP, result.Port, result.Status, result.ResponseTimeMs)

				if err != nil {
					log.Printf("Failed to store scan result: %v", err)
				} else {
					totalPorts++
				}
			}

			totalTargets++
		}
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
