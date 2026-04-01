package adapt

import (
	"testing"
	"time"

	"spectra/services/adaptation/internal/config"
	"spectra/services/adaptation/internal/llm"
	"spectra/services/adaptation/internal/models"
)

func TestAttemptRepairReturnsPatch(t *testing.T) {
	client := llm.NewClient(config.LLMConfig{
		BaseURL:     "https://api.openai.com/v1",
		APIKey:      "",
		Model:       "gpt-4.1",
		Temperature: 0.1,
		MaxTokens:   500,
		Timeout:     2 * time.Second,
	})
	request := models.AdaptRequest{
		TargetSiteContext: models.TargetSiteContext{
			Page: models.PageContext{
				Origin: "https://example.com",
			},
		},
		ComponentPack: models.ComponentPack{
			WrapperRootID:    "spectra-root",
			NormalizedHTML:   "<button data-spectra-node-id='n1'>CTA</button>",
			StableNodeIDs:    []string{"n1"},
			ProtectedNodeIDs: []string{},
		},
	}
	firstPatch := models.AdaptationPatch{
		Strategy:    "css_override",
		Summary:     "first patch",
		OverrideCSS: "button { color: red; }",
	}

	repaired, err := AttemptRepair(request, firstPatch, errExample{}, client)
	if err != nil {
		t.Fatalf("expected repair to succeed, got error: %v", err)
	}
	if repaired.Strategy != "css_override" {
		t.Fatalf("expected css_override, got %s", repaired.Strategy)
	}
}

type errExample struct{}

func (errExample) Error() string {
	return "scoping failed"
}
