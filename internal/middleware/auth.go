package middleware

import (
	"context"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math/big"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type AzureADClaims struct {
	jwt.RegisteredClaims
	Name              string `json:"name"`
	PreferredUsername string `json:"preferred_username"`
	Email             string `json:"email"`
}

type JWK struct {
	Kty string   `json:"kty"`
	Use string   `json:"use"`
	Kid string   `json:"kid"`
	N   string   `json:"n"`
	E   string   `json:"e"`
	X5c []string `json:"x5c"`
}

type JWKS struct {
	Keys []JWK `json:"keys"`
}

var (
	publicKeys     = make(map[string]*rsa.PublicKey)
	publicKeysMux  sync.RWMutex
	lastKeyFetch   time.Time
	keyFetchPeriod = 24 * time.Hour
)

func JWTAuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, "Authorization header required", http.StatusUnauthorized)
			return
		}

		bearerToken := strings.Split(authHeader, " ")
		if len(bearerToken) != 2 || bearerToken[0] != "Bearer" {
			http.Error(w, "Invalid authorization header format", http.StatusUnauthorized)
			return
		}

		tokenString := bearerToken[1]

		claims, err := validateToken(tokenString)
		if err != nil {
			log.Printf("Token validation error: %v", err)
			http.Error(w, "Invalid token", http.StatusUnauthorized)
			return
		}

		// Add user info to context
		ctx := context.WithValue(r.Context(), "user", claims)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func validateToken(tokenString string) (*AzureADClaims, error) {
	tenantID := os.Getenv("AZURE_TENANT_ID")
	clientID := os.Getenv("AZURE_CLIENT_ID")

	if tenantID == "" {
		return nil, errors.New("AZURE_TENANT_ID not configured")
	}
	if clientID == "" {
		return nil, errors.New("AZURE_CLIENT_ID not configured")
	}

	// Parse token to get the kid (key ID) from header
	token, err := jwt.ParseWithClaims(tokenString, &AzureADClaims{}, func(token *jwt.Token) (interface{}, error) {
		// Verify signing method
		if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}

		// Get the kid from token header
		kid, ok := token.Header["kid"].(string)
		if !ok {
			return nil, errors.New("kid header not found")
		}

		// Get public key for this kid
		publicKey, err := getPublicKey(kid, tenantID)
		if err != nil {
			log.Printf("Failed to get public key for kid %s: %v", kid, err)
			return nil, err
		}

		return publicKey, nil
	})

	if err != nil {
		log.Printf("Token parsing failed: %v", err)
		return nil, err
	}

	if !token.Valid {
		return nil, errors.New("token is invalid")
	}

	claims, ok := token.Claims.(*AzureADClaims)
	if !ok {
		return nil, errors.New("invalid claims type")
	}

	// Verify issuer
	expectedIssuer := fmt.Sprintf("https://login.microsoftonline.com/%s/v2.0", tenantID)
	if claims.Issuer != expectedIssuer {
		log.Printf("Invalid issuer. Expected: %s, Got: %s", expectedIssuer, claims.Issuer)
		return nil, fmt.Errorf("invalid issuer: %s", claims.Issuer)
	}

	// Verify audience - accept either our client ID or Microsoft Graph
	validAudience := false
	microsoftGraphID := "00000003-0000-0000-c000-000000000000"
	for _, aud := range claims.Audience {
		if aud == clientID || aud == fmt.Sprintf("api://%s", clientID) || aud == microsoftGraphID {
			validAudience = true
			break
		}
	}

	if !validAudience {
		log.Printf("Invalid audience. Expected: %s or %s, Got: %v", clientID, microsoftGraphID, claims.Audience)
		return nil, fmt.Errorf("invalid audience: %v", claims.Audience)
	}

	log.Printf("Token validated successfully for user: %s", claims.PreferredUsername)
	return claims, nil
}

func getPublicKey(kid, tenantID string) (*rsa.PublicKey, error) {
	// Check if we need to refresh keys
	publicKeysMux.RLock()
	if time.Since(lastKeyFetch) > keyFetchPeriod {
		publicKeysMux.RUnlock()
		if err := fetchPublicKeys(tenantID); err != nil {
			return nil, err
		}
		publicKeysMux.RLock()
	}

	key, exists := publicKeys[kid]
	publicKeysMux.RUnlock()

	if !exists {
		// Try fetching keys again in case they've been rotated
		if err := fetchPublicKeys(tenantID); err != nil {
			return nil, err
		}

		publicKeysMux.RLock()
		key, exists = publicKeys[kid]
		publicKeysMux.RUnlock()

		if !exists {
			return nil, fmt.Errorf("public key not found for kid: %s", kid)
		}
	}

	return key, nil
}

func fetchPublicKeys(tenantID string) error {
	jwksURL := fmt.Sprintf("https://login.microsoftonline.com/%s/discovery/v2.0/keys", tenantID)

	resp, err := http.Get(jwksURL)
	if err != nil {
		return fmt.Errorf("failed to fetch JWKS: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("JWKS endpoint returned status: %d", resp.StatusCode)
	}

	var jwks JWKS
	if err := json.NewDecoder(resp.Body).Decode(&jwks); err != nil {
		return fmt.Errorf("failed to decode JWKS: %w", err)
	}

	newKeys := make(map[string]*rsa.PublicKey)
	for _, key := range jwks.Keys {
		if key.Kty != "RSA" {
			continue
		}

		publicKey, err := buildRSAPublicKey(key.N, key.E)
		if err != nil {
			log.Printf("Warning: failed to build public key for kid %s: %v", key.Kid, err)
			continue
		}

		newKeys[key.Kid] = publicKey
	}

	publicKeysMux.Lock()
	publicKeys = newKeys
	lastKeyFetch = time.Now()
	publicKeysMux.Unlock()

	log.Printf("Fetched %d public keys from Azure AD", len(newKeys))
	return nil
}

func buildRSAPublicKey(nStr, eStr string) (*rsa.PublicKey, error) {
	nBytes, err := base64.RawURLEncoding.DecodeString(nStr)
	if err != nil {
		return nil, err
	}

	eBytes, err := base64.RawURLEncoding.DecodeString(eStr)
	if err != nil {
		return nil, err
	}

	n := new(big.Int).SetBytes(nBytes)

	var e int
	for _, b := range eBytes {
		e = e<<8 + int(b)
	}

	return &rsa.PublicKey{
		N: n,
		E: e,
	}, nil
}
