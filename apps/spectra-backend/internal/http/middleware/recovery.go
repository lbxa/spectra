package middleware

import (
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/lbxa/spectra/apps/spectra-backend/internal/adapt"
	"github.com/lbxa/spectra/apps/spectra-backend/internal/models"
)

func Recovery(logger *slog.Logger) gin.HandlerFunc {
	return gin.CustomRecovery(func(c *gin.Context, recovered any) {
		requestID := GetRequestID(c)
		logger.Error(
			"http_panic",
			"request_id", requestID,
			"method", c.Request.Method,
			"path", c.Request.URL.Path,
			"panic", recovered,
		)

		c.AbortWithStatusJSON(http.StatusInternalServerError, models.ErrorResponse{
			OK:        false,
			Code:      string(adapt.ErrorCodeInternalFailure),
			Message:   "internal error",
			RequestID: requestID,
		})
	})
}
