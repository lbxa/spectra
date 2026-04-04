package adapt

import (
	"context"
	"errors"
	"log/slog"
	"testing"

	"github.com/lbxa/spectra/apps/spectra-backend/internal/llm"
	"github.com/lbxa/spectra/apps/spectra-backend/internal/models"
)

type fakeClient struct {
	patches []models.AdaptationPatch
	err     error
	index   int
}

func (f *fakeClient) Adapt(context.Context, llm.Prompt) (models.AdaptationPatch, llm.Usage, error) {
	if f.err != nil {
		return models.AdaptationPatch{}, llm.Usage{}, f.err
	}
	if f.index >= len(f.patches) {
		return models.AdaptationPatch{}, llm.Usage{}, errors.New("no patch")
	}
	result := f.patches[f.index]
	f.index++
	return result, llm.Usage{}, nil
}

func TestServiceReturnsPatchOnFirstValidResult(t *testing.T) {
	client := &fakeClient{
		patches: []models.AdaptationPatch{
			{
				Strategy:    "css_override",
				OverrideCSS: ":scope .good{color:red;}",
				Confidence:  0.7,
			},
		},
	}
	service := NewService(client, NewValidator(2000), slog.Default(), false)
	patch, err := service.Adapt(context.Background(), models.AdaptRequest{}, "req-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if patch.OverrideCSS != ":scope .good{color:red;}" {
		t.Fatalf("expected valid patch, got %q", patch.OverrideCSS)
	}
	if client.index != 1 {
		t.Fatalf("expected one LLM call, got %d", client.index)
	}
}

func TestServiceNormalizesUnscopedSelectorBeforeValidation(t *testing.T) {
	client := &fakeClient{
		patches: []models.AdaptationPatch{
			{
				Strategy:    "css_override",
				OverrideCSS: ".btn{color:red;}",
				Confidence:  0.7,
			},
		},
	}
	service := NewService(client, NewValidator(2000), slog.Default(), false)
	patch, err := service.Adapt(context.Background(), models.AdaptRequest{}, "req-normalize")
	if err != nil {
		t.Fatalf("expected normalization to pass validation, got error: %v", err)
	}
	if patch.OverrideCSS != ":scope .btn{color:red;}" {
		t.Fatalf("expected normalized scoped css, got %q", patch.OverrideCSS)
	}
	if client.index != 1 {
		t.Fatalf("expected one LLM call, got %d", client.index)
	}
}

func TestServiceReturnsValidationFailure(t *testing.T) {
	client := &fakeClient{
		patches: []models.AdaptationPatch{
			{
				Strategy:    "css_override",
				OverrideCSS: ":scope .bad{background-image:url(https://example.com/a.png);}",
				Confidence:  0.7,
			},
		},
	}
	service := NewService(client, NewValidator(2000), slog.Default(), false)
	_, err := service.Adapt(context.Background(), models.AdaptRequest{}, "req-2")
	if err == nil {
		t.Fatalf("expected validation error")
	}
	if client.index != 1 {
		t.Fatalf("expected one LLM call, got %d", client.index)
	}
}
