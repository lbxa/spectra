package adapt

import (
	"encoding/json"
	"fmt"

	"github.com/lbxa/spectra/apps/spectra-backend/internal/models"
)

type PromptBundle struct {
	System    string
	Developer string
	User      string
}

func BuildPrompt(request models.AdaptRequest) (PromptBundle, error) {
	userPayload, err := json.Marshal(request)
	if err != nil {
		return PromptBundle{}, fmt.Errorf("marshal user payload: %w", err)
	}

	return PromptBundle{
		System: `You are a strict UI adaptation engine.
Return only JSON matching schema.
Patch, do not rewrite.
Never return JavaScript.
Never restructure DOM tree.
Never change textual content.
Use scoped selectors only.
Preserve component structure and hierarchy.
Translate cosmetic tokens into the host scene, not literal source values.
Prioritize typography alignment first (font family, size scale, weight, line-height, text color).
Map semantic color intent into host palette/contrast roles.
Adapt surface styling conservatively (background, border, radius, shadow).
Treat spacing/density as low-priority and only adjust when host scene strongly signals mismatch.
Valid selector examples:
- :scope .btn { color: #111; }
- [data-spectra-preview-content='true'] .btn { color: #111; }
Invalid selector examples:
- .btn { color: #111; }
- button { color: #111; }
Preserve protected nodes exactly.
Prefer minimal deltas.`,
		Developer: `Output must be an AdaptationPatch.
Do not include markdown, prose, code fences, or extra fields.
Favor overrideCss and limited attributeEdits.
Never include external assets (url(http...), @import, script, data execution vectors).
Use hostSceneSummary and componentIntentSummary when present to guide translation.
Do not reinterpret layout or move elements.`,
		User: string(userPayload),
	}, nil
}
