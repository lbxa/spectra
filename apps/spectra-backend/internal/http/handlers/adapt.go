package handlers

import (
	"errors"
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/lbxa/spectra/apps/spectra-backend/internal/adapt"
	"github.com/lbxa/spectra/apps/spectra-backend/internal/http/middleware"
	"github.com/lbxa/spectra/apps/spectra-backend/internal/models"
)

type AdaptHandler struct {
	service *adapt.Service
	logger  *slog.Logger
}

func NewAdaptHandler(service *adapt.Service, logger *slog.Logger) *AdaptHandler {
	return &AdaptHandler{service: service, logger: logger}
}

func (h *AdaptHandler) PostAdapt(c *gin.Context) {
	requestID := middleware.GetRequestID(c)
	var request models.AdaptRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		h.logger.Warn("adapt_request_invalid", "request_id", requestID, "error", err.Error())
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			OK:        false,
			Code:      string(adapt.ErrorCodeBadRequest),
			Message:   "Invalid request payload",
			RequestID: requestID,
		})
		return
	}
	h.logger.Info(
		"adapt_request_received",
		"request_id", requestID,
		"url", request.TargetSiteContext.URL,
		"title", request.TargetSiteContext.Title,
		"color_tokens", len(request.TargetSiteContext.ColorTokens),
		"native_exemplars", len(request.TargetSiteContext.NativeExemplars),
		"scene_font_weights", len(request.TargetSiteContext.HostSceneSummary.Typography.CommonFontWeights),
		"protected_node_ids", len(request.TargetSiteContext.ProtectedNodeIDs),
		"component_id", request.ComponentPack.ComponentID,
		"semantic_role_hint", request.ComponentPack.SemanticRoleHint,
		"component_html_chars", len(request.ComponentPack.HTML),
		"component_css_chars", len(request.ComponentPack.CSSText),
	)

	patch, err := h.service.Adapt(c.Request.Context(), request, requestID)
	if err != nil {
		var adaptErr *adapt.AdaptError
		if errors.As(err, &adaptErr) {
			h.logger.Warn(
				"adapt_request_failed",
				"request_id", requestID,
				"code", adaptErr.Code,
				"status", adaptErr.Status,
				"message", adaptErr.Error(),
				"validation_issue_count", len(adaptErr.Issues),
			)
			c.JSON(adaptErr.Status, models.ErrorResponse{
				OK:               false,
				Code:             string(adaptErr.Code),
				Message:          adaptErr.Error(),
				RequestID:        requestID,
				ValidationIssues: adaptErr.Issues,
			})
			return
		}

		h.logger.Error("adapt_request_failed", "request_id", requestID, "code", adapt.ErrorCodeInternalFailure, "error", err.Error())
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			OK:        false,
			Code:      string(adapt.ErrorCodeInternalFailure),
			Message:   "internal error",
			RequestID: requestID,
		})
		return
	}
	h.logger.Info(
		"adapt_response_sent",
		"request_id", requestID,
		"strategy", patch.Strategy,
		"confidence", patch.Confidence,
		"warnings", len(patch.Warnings),
		"override_css_chars", len(patch.OverrideCSS),
	)

	c.JSON(http.StatusOK, models.AdaptResponse{
		OK:    true,
		Patch: patch,
	})
}
