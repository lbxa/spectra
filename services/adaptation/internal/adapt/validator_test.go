package adapt

import (
	"testing"

	"spectra/services/adaptation/internal/models"
)

func TestValidatePatchAcceptsScopedPatch(t *testing.T) {
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
	patch := models.AdaptationPatch{
		Strategy:    "css_override",
		Summary:     "Theme adaptation",
		OverrideCSS: "#spectra-root button { color: rgb(15, 23, 42); }",
		AttributeEdits: []models.AttributeEdit{
			{
				NodeID: "n1",
				Name:   "class",
				Value:  "btn-primary",
			},
		},
		PreservedNodeIDs: []string{"n1"},
		Confidence:       0.75,
		Warnings:         []string{},
	}

	if err := ValidatePatch(request, patch); err != nil {
		t.Fatalf("expected patch to validate, got error: %v", err)
	}
}

func TestValidatePatchRejectsUnscopedSelector(t *testing.T) {
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
	patch := models.AdaptationPatch{
		Strategy:         "css_override",
		Summary:          "Theme adaptation",
		OverrideCSS:      "button { color: red; }",
		AttributeEdits:   []models.AttributeEdit{},
		PreservedNodeIDs: []string{"n1"},
		Confidence:       0.75,
		Warnings:         []string{},
	}

	if err := ValidatePatch(request, patch); err == nil {
		t.Fatalf("expected unscoped patch to fail validation")
	}
}
