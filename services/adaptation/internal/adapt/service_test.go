package adapt

import (
	"bytes"
	"context"
	"log/slog"
	"testing"
	"time"

	"spectra/services/adaptation/internal/config"
	"spectra/services/adaptation/internal/llm"
	"spectra/services/adaptation/internal/models"
)

func TestServiceAdaptReturnsPatch(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(bytes.NewBuffer(nil), nil))
	request := models.AdaptRequest{
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
			NormalizedHTML:   "<button data-spectra-node-id='n1'>CTA</button>",
			StableNodeIDs:    []string{"n1"},
			ProtectedNodeIDs: []string{"n1"},
		},
	}
	llmClient := llm.NewClient(config.LLMConfig{
		BaseURL:     "https://api.openai.com/v1",
		APIKey:      "",
		Model:       "gpt-4.1",
		Temperature: 0.1,
		MaxTokens:   500,
		Timeout:     2 * time.Second,
	})
	service := NewService(logger, llmClient)

	result, err := service.Adapt(context.Background(), "req-test", request)
	if err != nil {
		t.Fatalf("expected adaptation success, got error: %v", err)
	}
	if result.Patch.Strategy != "css_override" {
		t.Fatalf("expected css_override strategy, got %s", result.Patch.Strategy)
	}
	if result.Patch.Summary == "" {
		t.Fatalf("expected non-empty summary")
	}
}
