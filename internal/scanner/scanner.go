package scanner

import (
	"fmt"
	"net"
	"time"
)

var CommonPorts = []int{
	21,    // FTP
	22,    // SSH
	23,    // Telnet
	25,    // SMTP
	53,    // DNS
	80,    // HTTP
	110,   // POP3
	143,   // IMAP
	443,   // HTTPS
	445,   // SMB
	3306,  // MySQL
	3389,  // RDP
	5432,  // PostgreSQL
	5900,  // VNC
	6379,  // Redis
	8080,  // HTTP Alt
	8443,  // HTTPS Alt
	27017, // MongoDB
}

type PortScanResult struct {
	IP             string
	Port           int
	Status         string
	ResponseTimeMs int
}

// ScanPort checks if a specific port is open on an IP address
func ScanPort(ip string, port int, timeout time.Duration) PortScanResult {
	result := PortScanResult{
		IP:     ip,
		Port:   port,
		Status: "closed",
	}

	target := fmt.Sprintf("%s:%d", ip, port)
	start := time.Now()

	conn, err := net.DialTimeout("tcp", target, timeout)
	elapsed := time.Since(start)

	if err != nil {
		// Port is closed or filtered
		result.Status = "closed"
		return result
	}

	conn.Close()
	result.Status = "open"
	result.ResponseTimeMs = int(elapsed.Milliseconds())

	return result
}

// ScanIP scans all common ports on a single IP address
func ScanIP(ip string, ports []int, timeout time.Duration) []PortScanResult {
	results := make([]PortScanResult, 0, len(ports))

	for _, port := range ports {
		result := ScanPort(ip, port, timeout)
		results = append(results, result)
	}

	return results
}

// ParseCIDR parses a CIDR notation and returns all IP addresses in the range
func ParseCIDR(cidr string) ([]string, error) {
	// Check if it's a single IP or CIDR
	if !contains(cidr, "/") {
		// Single IP address
		ip := net.ParseIP(cidr)
		if ip == nil {
			return nil, fmt.Errorf("invalid IP address: %s", cidr)
		}
		return []string{cidr}, nil
	}

	// Parse CIDR
	ip, ipnet, err := net.ParseCIDR(cidr)
	if err != nil {
		return nil, err
	}

	var ips []string
	for ip := ip.Mask(ipnet.Mask); ipnet.Contains(ip); inc(ip) {
		ips = append(ips, ip.String())
	}

	// Remove network and broadcast addresses for networks smaller than /31
	if len(ips) > 2 {
		ips = ips[1 : len(ips)-1]
	}

	return ips, nil
}

// Helper function to increment IP address
func inc(ip net.IP) {
	for j := len(ip) - 1; j >= 0; j-- {
		ip[j]++
		if ip[j] > 0 {
			break
		}
	}
}

// Helper function to check if string contains substring
func contains(s, substr string) bool {
	for i := 0; i < len(s); i++ {
		if i+len(substr) > len(s) {
			return false
		}
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
