package adapt

import (
	"testing"

	"github.com/lbxa/spectra/apps/spectra-backend/internal/models"
)

func TestValidatorAcceptsScopedPatch(t *testing.T) {
	validator := NewValidator(1000)
	request := models.AdaptRequest{
		TargetSiteContext: models.TargetSiteContext{
			ProtectedNodeIDs: []string{"node-1"},
		},
	}
	patch := models.AdaptationPatch{
		Strategy:         "css_override",
		OverrideCSS:      ":scope .btn{color:#111;}",
		PreservedNodeIDs: []string{"node-1"},
		Confidence:       0.8,
	}

	issues := validator.Validate(request, patch)
	if len(issues) != 0 {
		t.Fatalf("expected no issues, got %d", len(issues))
	}
}

func TestValidatorRejectsUnscopedSelector(t *testing.T) {
	validator := NewValidator(1000)
	request := models.AdaptRequest{}
	patch := models.AdaptationPatch{
		Strategy:    "css_override",
		OverrideCSS: ".btn{color:red;}",
		Confidence:  0.5,
	}

	issues := validator.Validate(request, patch)
	if len(issues) == 0 {
		t.Fatalf("expected issues")
	}
}
