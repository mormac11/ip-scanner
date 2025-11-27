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
	keycloakURL := os.Getenv("KEYCLOAK_URL")
	realm := os.Getenv("KEYCLOAK_REALM")
	clientID := os.Getenv("KEYCLOAK_CLIENT_ID")

	if keycloakURL == "" {
		return nil, errors.New("KEYCLOAK_URL not configured")
	}
	if realm == "" {
		return nil, errors.New("KEYCLOAK_REALM not configured")
	}
	if clientID == "" {
		return nil, errors.New("KEYCLOAK_CLIENT_ID not configured")
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
		publicKey, err := getPublicKey(kid, keycloakURL, realm)
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
	expectedIssuer := fmt.Sprintf("%s/realms/%s", keycloakURL, realm)
	if claims.Issuer != expectedIssuer {
		log.Printf("Invalid issuer. Expected: %s, Got: %s", expectedIssuer, claims.Issuer)
		return nil, fmt.Errorf("invalid issuer: %s", claims.Issuer)
	}

	// Verify audience
	validAudience := false
	for _, aud := range claims.Audience {
		if aud == clientID {
			validAudience = true
			break
		}
	}

	if !validAudience {
		log.Printf("Invalid audience. Expected: %s, Got: %v", clientID, claims.Audience)
		return nil, fmt.Errorf("invalid audience: %v", claims.Audience)
	}

	log.Printf("Token validated successfully for user: %s", claims.PreferredUsername)
	return claims, nil
}

func getPublicKey(kid, keycloakURL, realm string) (*rsa.PublicKey, error) {
	// Check if we need to refresh keys
	publicKeysMux.RLock()
	if time.Since(lastKeyFetch) > keyFetchPeriod {
		publicKeysMux.RUnlock()
		if err := fetchPublicKeys(keycloakURL, realm); err != nil {
			return nil, err
		}
		publicKeysMux.RLock()
	}

	key, exists := publicKeys[kid]
	publicKeysMux.RUnlock()

	if !exists {
		// Try fetching keys again in case they've been rotated
		if err := fetchPublicKeys(keycloakURL, realm); err != nil {
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

func fetchPublicKeys(keycloakURL, realm string) error {
	jwksURL := fmt.Sprintf("%s/realms/%s/protocol/openid-connect/certs", keycloakURL, realm)

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

	log.Printf("Fetched %d public keys from Keycloak", len(newKeys))
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
