package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/lbxa/spectra/apps/spectra-backend/internal/adapt"
	"github.com/lbxa/spectra/apps/spectra-backend/internal/llm"
	"github.com/lbxa/spectra/apps/spectra-backend/internal/models"
)

type stubClient struct {
	patch models.AdaptationPatch
}

func (s *stubClient) Adapt(context.Context, llm.Prompt) (models.AdaptationPatch, llm.Usage, error) {
	return s.patch, llm.Usage{}, nil
}

func TestPostAdaptBadRequest(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler := NewAdaptHandler(adapt.NewService(&stubClient{}, adapt.NewValidator(2000), slog.Default(), false), slog.Default())
	router := gin.New()
	router.POST("/v1/adapt", handler.PostAdapt)

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/v1/adapt", bytes.NewBufferString(`{"bad":"shape"}`))
	request.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", recorder.Code)
	}
}

func TestPostAdaptSuccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	client := &stubClient{
		patch: models.AdaptationPatch{
			Strategy:    "css_override",
			OverrideCSS: ":scope .button{color:#111;}",
			Confidence:  0.9,
		},
	}
	handler := NewAdaptHandler(adapt.NewService(client, adapt.NewValidator(2000), slog.Default(), false), slog.Default())
	router := gin.New()
	router.POST("/v1/adapt", handler.PostAdapt)

	payload := models.AdaptRequest{
		TargetSiteContext: models.TargetSiteContext{
			URL:              "https://example.com",
			RootSelector:     "section",
			ProtectedNodeIDs: []string{"node-1"},
			HostSceneSummary: models.HostSceneSummary{
				Typography: models.HostSceneTypography{
					BodyFontFamily:    "Inter",
					BodyFontSizePx:    16,
					CommonFontWeights: []int{400, 500},
				},
				Density: models.HostSceneDensity{
					Compactness: "balanced",
				},
			},
		},
		ComponentPack: models.ComponentPack{
			ComponentID: "cmp-1",
			HTML:        "<button>Buy</button>",
			ComponentIntentSummary: models.ComponentIntentSummary{
				SemanticRole:   "interactive",
				EmphasisLevel:  "balanced",
				HeadingScale:   1.1,
				DominantWeight: 500,
				BodyWeight:     400,
				CornerStyle:    "rounded",
				ColorIntent:    "accent",
			},
		},
	}
	body, _ := json.Marshal(payload)

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/v1/adapt", bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d, body=%s", recorder.Code, recorder.Body.String())
	}
}
