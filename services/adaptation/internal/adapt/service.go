package adapt

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"spectra/services/adaptation/internal/llm"
	"spectra/services/adaptation/internal/models"
)

type Service struct {
	logger    *slog.Logger
	llmClient *llm.Client
}

type Result struct {
	Patch      models.AdaptationPatch
	Usage      models.TokenUsage
	UsedRepair bool
}

func NewService(logger *slog.Logger, llmClient *llm.Client) *Service {
	return &Service{
		logger:    logger,
		llmClient: llmClient,
	}
}

func (s *Service) Adapt(ctx context.Context, requestID string, request models.AdaptRequest) (Result, error) {
	if err := ValidateRequest(request); err != nil {
		return Result{}, fmt.Errorf("request validation failed: %w", err)
	}

	startedAt := time.Now()
	promptPayload, err := BuildPromptPayload(request)
	if err != nil {
		return Result{}, fmt.Errorf("build prompt payload: %w", err)
	}
	patch, usage, err := s.llmClient.GeneratePatch(llm.PromptPayload{
		System:    promptPayload.System,
		Developer: promptPayload.Developer,
		UserJSON:  promptPayload.UserJSON,
	})
	if err != nil {
		return Result{}, fmt.Errorf("llm generation failed: %w", err)
	}
	modelLatency := time.Since(startedAt)

	if validationErr := ValidatePatch(request, patch); validationErr != nil {
		s.logger.Warn("validation_failed_first_pass",
			slog.String("request_id", requestID),
			slog.String("error", validationErr.Error()),
		)
		repairPatch, repairUsage, repairErr := s.repair(ctx, request, patch, validationErr)
		if repairErr != nil {
			return Result{}, fmt.Errorf("repair failed: %w", repairErr)
		}
		if repairValidationErr := ValidatePatch(request, repairPatch); repairValidationErr != nil {
			return Result{}, fmt.Errorf("repair validation failed: %w", repairValidationErr)
		}
		return Result{
			Patch: repairPatch,
			Usage: models.TokenUsage{
				PromptTokens:     usage.PromptTokens + repairUsage.PromptTokens,
				CompletionTokens: usage.CompletionTokens + repairUsage.CompletionTokens,
				TotalTokens:      usage.TotalTokens + repairUsage.TotalTokens,
			},
			UsedRepair: true,
		}, nil
	}

	s.logger.Info("adaptation_generated",
		slog.String("request_id", requestID),
		slog.Duration("model_latency", modelLatency),
		slog.Float64("confidence", patch.Confidence),
		slog.Int("token_usage_total", usage.TotalTokens),
	)

	return Result{
		Patch:      patch,
		Usage:      usage,
		UsedRepair: false,
	}, nil
}

func (s *Service) repair(
	ctx context.Context,
	request models.AdaptRequest,
	firstPatch models.AdaptationPatch,
	validationErr error,
) (models.AdaptationPatch, models.TokenUsage, error) {
	select {
	case <-ctx.Done():
		return models.AdaptationPatch{}, models.TokenUsage{}, ctx.Err()
	default:
	}
	repairPayload, err := BuildRepairPayload(request, firstPatch, validationErr.Error())
	if err != nil {
		return models.AdaptationPatch{}, models.TokenUsage{}, err
	}
	repairPatch, repairUsage, err := s.llmClient.GeneratePatch(llm.PromptPayload{
		System:    repairPayload.System,
		Developer: repairPayload.Developer,
		UserJSON:  repairPayload.UserJSON,
	})
	if err != nil {
		return models.AdaptationPatch{}, models.TokenUsage{}, err
	}
	return repairPatch, repairUsage, nil
}
