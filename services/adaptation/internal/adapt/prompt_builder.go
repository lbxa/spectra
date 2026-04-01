package adapt

import (
	"encoding/json"
	"fmt"

	"spectra/services/adaptation/internal/models"
)

const systemPrompt = `You are a frontend adaptation engine.
Return only a safe JSON patch payload that adapts a component's style to match the target site.
Never output prose outside JSON.`

const developerPrompt = `Hard constraints:
- Return strategy "css_override" only.
- No JavaScript.
- No DOM restructuring.
- No content rewrites.
- No external assets.
- CSS selectors must be scoped to wrapperRootId.
- Preserve all protected node ids.
- Keep changes minimal.
`

type PromptPayload struct {
	System    string
	Developer string
	UserJSON  string
}

func BuildPromptPayload(request models.AdaptRequest) (PromptPayload, error) {
	userBytes, err := json.Marshal(request)
	if err != nil {
		return PromptPayload{}, fmt.Errorf("marshal prompt user payload: %w", err)
	}
	return PromptPayload{
		System:    systemPrompt,
		Developer: developerPrompt,
		UserJSON:  string(userBytes),
	}, nil
}

func BuildRepairPayload(
	request models.AdaptRequest,
	firstPatch models.AdaptationPatch,
	validationError string,
) (PromptPayload, error) {
	body := struct {
		Request            models.AdaptRequest   `json:"request"`
		PreviousPatch      models.AdaptationPatch `json:"previousPatch"`
		ValidationFailures string                 `json:"validationFailures"`
		Instruction        string                 `json:"instruction"`
	}{
		Request:            request,
		PreviousPatch:      firstPatch,
		ValidationFailures: validationError,
		Instruction:        "Repair the patch and return valid safe JSON only.",
	}
	userBytes, err := json.Marshal(body)
	if err != nil {
		return PromptPayload{}, fmt.Errorf("marshal repair payload: %w", err)
	}
	return PromptPayload{
		System:    systemPrompt,
		Developer: developerPrompt,
		UserJSON:  string(userBytes),
	}, nil
}
