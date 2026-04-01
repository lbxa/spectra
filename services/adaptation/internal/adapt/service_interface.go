package adapt

import (
	"context"

	"spectra/services/adaptation/internal/models"
)

type AdaptationService interface {
	Adapt(ctx context.Context, requestID string, request models.AdaptRequest) (Result, error)
}
