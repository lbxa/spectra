package adapt

import "github.com/lbxa/spectra/apps/spectra-backend/internal/models"

type ErrorCode string

const (
	ErrorCodeBadRequest           ErrorCode = "bad_request"
	ErrorCodeUpstreamModelFailure ErrorCode = "upstream_model_failure"
	ErrorCodeTimeout              ErrorCode = "timeout"
	ErrorCodeValidationFailed     ErrorCode = "validation_failed"
	ErrorCodeInternalFailure      ErrorCode = "internal_error"
)

type AdaptError struct {
	Code   ErrorCode
	Status int
	Err    error
	Issues []models.ValidationIssue
}

func (e *AdaptError) Error() string {
	if e.Err == nil {
		return string(e.Code)
	}
	return e.Err.Error()
}
