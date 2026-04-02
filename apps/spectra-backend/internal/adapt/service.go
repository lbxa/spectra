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
	debug     bool
}

func NewService(client llm.Client, validator *Validator, logger *slog.Logger, debug bool) *Service {
	return &Service{
		client:    client,
		validator: validator,
		logger:    logger,
		debug:     debug,
	}
}

func (s *Service) Adapt(ctx context.Context, request models.AdaptRequest, requestID string) (models.AdaptationPatch, error) {
	s.logger.Info(
		"adaptation_prompt_build_started",
		"request_id", requestID,
		"url", request.TargetSiteContext.URL,
		"root_selector", request.TargetSiteContext.RootSelector,
		"color_tokens", len(request.TargetSiteContext.ColorTokens),
		"native_exemplars", len(request.TargetSiteContext.NativeExemplars),
		"protected_node_ids", len(request.TargetSiteContext.ProtectedNodeIDs),
		"semantic_role_hint", request.ComponentPack.SemanticRoleHint,
		"component_html_chars", len(request.ComponentPack.HTML),
		"component_css_chars", len(request.ComponentPack.CSSText),
	)
	prompt, err := BuildPrompt(request)
	if err != nil {
		return models.AdaptationPatch{}, &AdaptError{
			Code:   ErrorCodeInternalFailure,
			Status: http.StatusInternalServerError,
			Err:    err,
		}
	}
	s.logger.Info(
		"adaptation_prompt_built",
		"request_id", requestID,
		"system_chars", len(prompt.System),
		"developer_chars", len(prompt.Developer),
		"user_chars", len(prompt.User),
	)
	if s.debug {
		s.logger.Info(
			"adaptation_prompt_payloads",
			"request_id", requestID,
			"component_html", truncateForLog(request.ComponentPack.HTML),
			"component_css", truncateForLog(request.ComponentPack.CSSText),
			"user_prompt_payload", truncateForLog(prompt.User),
		)
	}

	patch, usage, err := s.client.Adapt(ctx, llm.Prompt{
		RequestID: requestID,
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
	if s.debug {
		s.logger.Info(
			"adaptation_patch_payload",
			"request_id", requestID,
			"strategy", patch.Strategy,
			"summary", patch.Summary,
			"override_css", truncateForLog(patch.OverrideCSS),
			"attribute_edits", patch.AttributeEdits,
			"preserved_node_ids", patch.PreservedNodeIDs,
			"warnings", patch.Warnings,
		)
	}

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

func truncateForLog(value string) string {
	const maxChars = 8000
	if len(value) <= maxChars {
		return value
	}
	return value[:maxChars] + "…"
}
