package handlers

import (
	"context"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"spectra/services/adaptation/internal/adapt"
	"spectra/services/adaptation/internal/models"
)

type AdaptHandler struct {
	logger  *slog.Logger
	service adapt.AdaptationService
}

func NewAdaptHandler(logger *slog.Logger, service adapt.AdaptationService) *AdaptHandler {
	return &AdaptHandler{
		logger:  logger,
		service: service,
	}
}

func (h *AdaptHandler) Handle(c *gin.Context) {
	requestID := resolveRequestID(c)
	ctx, cancel := context.WithTimeout(c.Request.Context(), 25*time.Second)
	defer cancel()

	var request models.AdaptRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		h.logger.Warn("invalid_request",
			slog.String("request_id", requestID),
			slog.String("error", err.Error()),
		)
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid_request",
		})
		return
	}

	result, err := h.service.Adapt(ctx, requestID, request)
	if err == nil {
		h.logger.Info("adapt_success",
			slog.String("request_id", requestID),
			slog.Bool("used_repair", result.UsedRepair),
			slog.Float64("confidence", result.Patch.Confidence),
			slog.Int("token_usage_total", result.Usage.TotalTokens),
		)
		c.JSON(http.StatusOK, result.Patch)
		return
	}

	errText := strings.ToLower(err.Error())
	statusCode := mapErrorToStatusCode(errText)
	h.logger.Warn("adapt_failed",
		slog.String("request_id", requestID),
		slog.Int("status_code", statusCode),
		slog.String("error", err.Error()),
	)
	c.JSON(statusCode, gin.H{
		"error": statusErrorCode(statusCode),
	})
}

func resolveRequestID(c *gin.Context) string {
	requestID := strings.TrimSpace(c.GetHeader("x-request-id"))
	if requestID != "" {
		return requestID
	}
	value := strings.TrimSpace(c.GetString("request_id"))
	if value != "" {
		return value
	}
	return "unknown"
}

func mapErrorToStatusCode(errText string) int {
	if strings.Contains(errText, "request validation failed") {
		return http.StatusBadRequest
	}
	if strings.Contains(errText, "repair validation failed") ||
		strings.Contains(errText, "validation failed") {
		return http.StatusUnprocessableEntity
	}
	if strings.Contains(errText, context.DeadlineExceeded.Error()) ||
		strings.Contains(errText, "timeout") {
		return http.StatusGatewayTimeout
	}
	return http.StatusBadGateway
}

func statusErrorCode(statusCode int) string {
	switch statusCode {
	case http.StatusBadRequest:
		return "invalid_request"
	case http.StatusUnprocessableEntity:
		return "patch_validation_failed"
	case http.StatusGatewayTimeout:
		return "timeout"
	default:
		return "upstream_error"
	}
}
