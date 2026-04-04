package middleware

import (
	"crypto/rand"
	"encoding/hex"

	"github.com/gin-gonic/gin"
)

const requestIDKey = "request_id"

func GetRequestID(c *gin.Context) string {
	requestID := c.GetString(requestIDKey)
	if requestID != "" {
		return requestID
	}
	requestID = c.GetHeader("X-Request-Id")
	if requestID != "" {
		return requestID
	}
	return "request-id-unavailable"
}

func ensureRequestID(c *gin.Context) string {
	requestID := c.GetHeader("X-Request-Id")
	if requestID == "" {
		requestID = generateRequestID()
	}
	c.Set(requestIDKey, requestID)
	c.Writer.Header().Set("X-Request-Id", requestID)
	return requestID
}

func generateRequestID() string {
	random := make([]byte, 6)
	if _, err := rand.Read(random); err != nil {
		return "request-id-unavailable"
	}
	return hex.EncodeToString(random)
}
