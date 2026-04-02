package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/lbxa/spectra/apps/spectra-backend/internal/adapt"
	"github.com/lbxa/spectra/apps/spectra-backend/internal/http/middleware"
	"github.com/lbxa/spectra/apps/spectra-backend/internal/models"
)

type AdaptHandler struct {
	service *adapt.Service
}

func NewAdaptHandler(service *adapt.Service) *AdaptHandler {
	return &AdaptHandler{service: service}
}

func (h *AdaptHandler) PostAdapt(c *gin.Context) {
	requestID := middleware.GetRequestID(c)
	var request models.AdaptRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			OK:        false,
			Code:      string(adapt.ErrorCodeBadRequest),
			Message:   "Invalid request payload",
			RequestID: requestID,
		})
		return
	}

	patch, err := h.service.Adapt(c.Request.Context(), request, requestID)
	if err != nil {
		var adaptErr *adapt.AdaptError
		if errors.As(err, &adaptErr) {
			c.JSON(adaptErr.Status, models.ErrorResponse{
				OK:               false,
				Code:             string(adaptErr.Code),
				Message:          adaptErr.Error(),
				RequestID:        requestID,
				ValidationIssues: adaptErr.Issues,
			})
			return
		}

		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			OK:        false,
			Code:      string(adapt.ErrorCodeInternalFailure),
			Message:   "internal error",
			RequestID: requestID,
		})
		return
	}

	c.JSON(http.StatusOK, models.AdaptResponse{
		OK:    true,
		Patch: patch,
	})
}
