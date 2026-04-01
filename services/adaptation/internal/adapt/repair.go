package adapt

import (
	"fmt"

	"spectra/services/adaptation/internal/llm"
	"spectra/services/adaptation/internal/models"
)

func AttemptRepair(
	request models.AdaptRequest,
	firstPatch models.AdaptationPatch,
	validationError error,
	client *llm.Client,
) (models.AdaptationPatch, error) {
	payload, err := BuildRepairPayload(request, firstPatch, validationError.Error())
	if err != nil {
		return models.AdaptationPatch{}, fmt.Errorf("build repair payload: %w", err)
	}
	repairPatch, _, err := client.GeneratePatch(llm.PromptPayload{
		System:    payload.System,
		Developer: payload.Developer,
		UserJSON:  payload.UserJSON,
	})
	if err != nil {
		return models.AdaptationPatch{}, fmt.Errorf("repair generation failed: %w", err)
	}
	return repairPatch, nil
}
