package scheduler

import (
	"context"
	"database/sql"
	"log"
	"sync"
	"time"

	awsService "ip-scanner/internal/aws"
)

type AWSScheduler struct {
	db       *sql.DB
	interval time.Duration
	stopCh   chan struct{}
	wg       sync.WaitGroup
}

func NewAWSScheduler(db *sql.DB, interval time.Duration) *AWSScheduler {
	return &AWSScheduler{
		db:       db,
		interval: interval,
		stopCh:   make(chan struct{}),
	}
}

// Start begins the scheduled AWS syncing
func (s *AWSScheduler) Start() {
	s.wg.Add(1)
	go s.run()
	log.Printf("AWS sync scheduler started with interval: %v", s.interval)
}

// Stop gracefully stops the scheduler
func (s *AWSScheduler) Stop() {
	close(s.stopCh)
	s.wg.Wait()
	log.Println("AWS sync scheduler stopped")
}

func (s *AWSScheduler) run() {
	defer s.wg.Done()

	// Run first sync after 1 minute (give time for app to start)
	time.Sleep(1 * time.Minute)
	s.performSync()

	ticker := time.NewTicker(s.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			s.performSync()
		case <-s.stopCh:
			return
		}
	}
}

func (s *AWSScheduler) performSync() {
	ctx := context.Background()
	log.Println("Starting AWS EC2 sync...")

	// Get stored credentials
	var accessKeyID, secretAccessKey, region string
	err := s.db.QueryRow(`
		SELECT access_key_id, secret_access_key, region
		FROM aws_credentials
		ORDER BY id DESC
		LIMIT 1
	`).Scan(&accessKeyID, &secretAccessKey, &region)

	if err == sql.ErrNoRows {
		log.Println("AWS credentials not configured, skipping sync")
		return
	}

	if err != nil {
		log.Printf("Failed to fetch AWS credentials: %v", err)
		return
	}

	// Create EC2 service with stored credentials
	ec2Svc, err := awsService.NewEC2ServiceWithCredentials(ctx, accessKeyID, secretAccessKey, region)
	if err != nil {
		log.Printf("Failed to initialize AWS service: %v", err)
		return
	}

	// Fetch public IPs from AWS
	awsIPs, err := ec2Svc.GetPublicIPs(ctx)
	if err != nil {
		log.Printf("Failed to fetch EC2 public IPs: %v", err)
		return
	}

	log.Printf("Found %d EC2 instances with public IPs", len(awsIPs))

	// Create a map of AWS IPs for quick lookup
	awsIPMap := make(map[string]bool)
	for _, ip := range awsIPs {
		awsIPMap[ip] = true
	}

	// Get all existing AWS-imported targets
	rows, err := s.db.Query(`
		SELECT id, target
		FROM scan_targets
		WHERE description = 'Auto-imported from AWS EC2'
	`)
	if err != nil {
		log.Printf("Failed to fetch existing AWS targets: %v", err)
		return
	}
	defer rows.Close()

	existingTargets := make(map[string]int) // map[ip]id
	for rows.Next() {
		var id int
		var target string
		if err := rows.Scan(&id, &target); err != nil {
			log.Printf("Failed to scan target row: %v", err)
			continue
		}
		existingTargets[target] = id
	}

	// Add new IPs that don't exist yet
	added := 0
	for ip := range awsIPMap {
		if _, exists := existingTargets[ip]; !exists {
			_, err := s.db.Exec(`
				INSERT INTO scan_targets (target, description, enabled)
				VALUES ($1, 'Auto-imported from AWS EC2', true)
			`, ip)

			if err != nil {
				log.Printf("Failed to add target %s: %v", ip, err)
			} else {
				added++
				log.Printf("Added new AWS EC2 target: %s", ip)
			}
		}
	}

	// Remove IPs that are no longer in AWS
	removed := 0
	for ip, id := range existingTargets {
		if !awsIPMap[ip] {
			_, err := s.db.Exec(`
				DELETE FROM scan_targets
				WHERE id = $1
			`, id)

			if err != nil {
				log.Printf("Failed to remove target %s: %v", ip, err)
			} else {
				removed++
				log.Printf("Removed AWS EC2 target (no longer in AWS): %s", ip)
			}
		}
	}

	log.Printf("AWS sync completed: %d added, %d removed, %d total AWS IPs", added, removed, len(awsIPs))
}
