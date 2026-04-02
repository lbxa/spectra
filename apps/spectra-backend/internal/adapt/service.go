package adapt

import (
	"context"
	"errors"
	"log/slog"
	"net/http"

	"github.com/lbxa/spectra/apps/spectra-backend/internal/llm"
	"github.com/lbxa/spectra/apps/spectra-backend/internal/models"
)

type Service struct {
	client    llm.Client
	validator *Validator
	logger    *slog.Logger
}

func NewService(client llm.Client, validator *Validator, logger *slog.Logger) *Service {
	return &Service{
		client:    client,
		validator: validator,
		logger:    logger,
	}
}

func (s *Service) Adapt(ctx context.Context, request models.AdaptRequest, requestID string) (models.AdaptationPatch, error) {
	prompt, err := BuildPrompt(request)
	if err != nil {
		return models.AdaptationPatch{}, &AdaptError{
			Code:   ErrorCodeInternalFailure,
			Status: http.StatusInternalServerError,
			Err:    err,
		}
	}

	patch, usage, err := s.client.Adapt(ctx, llm.Prompt{
		System:    prompt.System,
		Developer: prompt.Developer,
		User:      prompt.User,
	})
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) || errors.Is(ctx.Err(), context.DeadlineExceeded) {
			return models.AdaptationPatch{}, &AdaptError{
				Code:   ErrorCodeTimeout,
				Status: http.StatusGatewayTimeout,
				Err:    err,
			}
		}
		return models.AdaptationPatch{}, &AdaptError{
			Code:   ErrorCodeUpstreamModelFailure,
			Status: http.StatusBadGateway,
			Err:    err,
		}
	}

	patch.OverrideCSS = normalizeTopLevelScopeSelectors(patch.OverrideCSS)
	issues := s.validator.Validate(request, patch)

	s.logger.Info(
		"adaptation_outcome",
		"request_id", requestID,
		"validation_failures", len(issues),
		"confidence", patch.Confidence,
		"prompt_tokens", usage.PromptTokens,
		"completion_tokens", usage.CompletionTokens,
		"total_tokens", usage.TotalTokens,
		"estimated_cost_usd", usage.EstimatedCostUSD,
	)

	if len(issues) > 0 {
		unscopedSelectors := firstUnscopedSelectors(patch.OverrideCSS, 3)
		s.logger.Warn(
			"adaptation_validation_failed",
			"request_id", requestID,
			"validation_failures", len(issues),
			"validation_issue_codes", firstIssueCodes(issues, 5),
			"unscoped_selectors_sample", unscopedSelectors,
		)

		return models.AdaptationPatch{}, &AdaptError{
			Code:   ErrorCodeValidationFailed,
			Status: http.StatusUnprocessableEntity,
			Err:    errors.New("patch failed validation"),
			Issues: issues,
		}
	}

	return patch, nil
}

func firstIssueCodes(issues []models.ValidationIssue, limit int) []string {
	if limit <= 0 {
		return []string{}
	}

	codes := make([]string, 0, limit)
	for _, issue := range issues {
		if issue.Code == "" {
			continue
		}
		codes = append(codes, issue.Code)
		if len(codes) >= limit {
			break
		}
	}
	return codes
}
