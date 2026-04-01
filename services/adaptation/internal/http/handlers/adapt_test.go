package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"

	"spectra/services/adaptation/internal/adapt"
	"spectra/services/adaptation/internal/http/middleware"
	"spectra/services/adaptation/internal/models"
)

type stubAdaptationService struct {
	result adapt.Result
	err    error
}

func (s stubAdaptationService) Adapt(
	_ context.Context,
	_ string,
	_ models.AdaptRequest,
) (adapt.Result, error) {
	if s.err != nil {
		return adapt.Result{}, s.err
	}
	return s.result, nil
}

func TestAdaptHandlerReturns200ForValidPatch(t *testing.T) {
	gin.SetMode(gin.TestMode)
	logger := slog.New(slog.NewTextHandler(bytes.NewBuffer(nil), nil))
	handler := NewAdaptHandler(logger, stubAdaptationService{
		result: adapt.Result{
			Patch: models.AdaptationPatch{
				Strategy:    "css_override",
				Summary:     "Adapted",
				OverrideCSS: "#spectra-root button { color: rgb(15, 23, 42); }",
				Confidence:  0.82,
			},
			UsedRepair: false,
		},
	})
	router := gin.New()
	router.Use(middleware.RequestID())
	router.POST("/v1/adapt", handler.Handle)

	requestPayload := models.AdaptRequest{
		TargetSiteContext: models.TargetSiteContext{
			Page: models.PageContext{
				Origin: "https://example.com",
			},
			HardConstraints: models.HardConstraints{
				MaxPatchCSSBytes: 16000,
			},
		},
		ComponentPack: models.ComponentPack{
			WrapperRootID:    "spectra-root",
			NormalizedHTML:   "<button data-spectra-node-id=\"n1\">Click</button>",
			StableNodeIDs:    []string{"n1"},
			ProtectedNodeIDs: []string{},
		},
	}

	requestBytes, err := json.Marshal(requestPayload)
	if err != nil {
		t.Fatalf("marshal request: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/v1/adapt", bytes.NewReader(requestBytes))
	req.Header.Set("content-type", "application/json")
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d body=%s", http.StatusOK, recorder.Code, recorder.Body.String())
	}
}

func TestAdaptHandlerReturns400ForBadRequest(t *testing.T) {
	gin.SetMode(gin.TestMode)
	logger := slog.New(slog.NewTextHandler(bytes.NewBuffer(nil), nil))
	handler := NewAdaptHandler(logger, stubAdaptationService{})
	router := gin.New()
	router.Use(middleware.RequestID())
	router.POST("/v1/adapt", handler.Handle)

	req := httptest.NewRequest(http.MethodPost, "/v1/adapt", bytes.NewReader([]byte("{invalid-json")))
	req.Header.Set("content-type", "application/json")
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected status %d, got %d body=%s", http.StatusBadRequest, recorder.Code, recorder.Body.String())
	}
}

func TestAdaptHandlerReturns422ForValidationFailure(t *testing.T) {
	gin.SetMode(gin.TestMode)
	logger := slog.New(slog.NewTextHandler(bytes.NewBuffer(nil), nil))
	handler := NewAdaptHandler(logger, stubAdaptationService{
		err: errors.New("repair validation failed: overrideCss contains selectors not scoped to wrapperRootId"),
	})
	router := gin.New()
	router.Use(middleware.RequestID())
	router.POST("/v1/adapt", handler.Handle)

	requestPayload := models.AdaptRequest{
		TargetSiteContext: models.TargetSiteContext{
			Page: models.PageContext{
				Origin: "https://example.com",
			},
		},
		ComponentPack: models.ComponentPack{
			WrapperRootID:    "spectra-root",
			NormalizedHTML:   "<button data-spectra-node-id='n1'>Click</button>",
			StableNodeIDs:    []string{"n1"},
			ProtectedNodeIDs: []string{},
		},
	}
	requestBytes, err := json.Marshal(requestPayload)
	if err != nil {
		t.Fatalf("marshal request: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/v1/adapt", bytes.NewReader(requestBytes))
	req.Header.Set("content-type", "application/json")
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected status %d, got %d body=%s", http.StatusUnprocessableEntity, recorder.Code, recorder.Body.String())
	}
}

func TestAdaptHandlerReturns504OnTimeout(t *testing.T) {
	gin.SetMode(gin.TestMode)
	logger := slog.New(slog.NewTextHandler(bytes.NewBuffer(nil), nil))
	handler := NewAdaptHandler(logger, stubAdaptationService{
		err: context.DeadlineExceeded,
	})
	router := gin.New()
	router.Use(middleware.RequestID())
	router.POST("/v1/adapt", handler.Handle)

	requestPayload := models.AdaptRequest{
		TargetSiteContext: models.TargetSiteContext{
			Page: models.PageContext{
				Origin: "https://example.com",
			},
		},
		ComponentPack: models.ComponentPack{
			WrapperRootID:    "spectra-root",
			NormalizedHTML:   "<button data-spectra-node-id='n1'>Click</button>",
			StableNodeIDs:    []string{"n1"},
			ProtectedNodeIDs: []string{},
		},
	}
	requestBytes, err := json.Marshal(requestPayload)
	if err != nil {
		t.Fatalf("marshal request: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/v1/adapt", bytes.NewReader(requestBytes))
	req.Header.Set("content-type", "application/json")
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusGatewayTimeout {
		t.Fatalf("expected status %d, got %d body=%s", http.StatusGatewayTimeout, recorder.Code, recorder.Body.String())
	}
}
