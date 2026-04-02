package llm

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/lbxa/spectra/apps/spectra-backend/internal/models"
)

type Prompt struct {
	System    string
	Developer string
	User      string
}

type Usage struct {
	PromptTokens     int64
	CompletionTokens int64
	TotalTokens      int64
	EstimatedCostUSD float64
}

type Client interface {
	Adapt(ctx context.Context, prompt Prompt) (models.AdaptationPatch, Usage, error)
}

type OpenAIClient struct {
	httpClient *http.Client
	apiKey     string
	model      string
}

func NewOpenAIClient(apiKey, model string, timeout time.Duration) *OpenAIClient {
	return &OpenAIClient{
		httpClient: &http.Client{Timeout: timeout},
		apiKey:     apiKey,
		model:      model,
	}
}

func (c *OpenAIClient) Adapt(ctx context.Context, prompt Prompt) (models.AdaptationPatch, Usage, error) {
	body := map[string]any{
		"model": c.model,
		"messages": []map[string]string{
			{"role": "system", "content": prompt.System},
			{"role": "developer", "content": prompt.Developer},
			{"role": "user", "content": prompt.User},
		},
		"temperature":           0.1,
		"max_completion_tokens": 2400,
		"response_format": map[string]any{
			"type": "json_schema",
			"json_schema": map[string]any{
				"name":   "adaptation_patch",
				"strict": true,
				"schema": adaptationPatchSchema(),
			},
		},
	}
	payload, err := json.Marshal(body)
	if err != nil {
		return models.AdaptationPatch{}, Usage{}, fmt.Errorf("marshal openai request: %w", err)
	}

	request, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.openai.com/v1/chat/completions", bytes.NewReader(payload))
	if err != nil {
		return models.AdaptationPatch{}, Usage{}, fmt.Errorf("build openai request: %w", err)
	}
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Authorization", "Bearer "+c.apiKey)

	response, err := c.httpClient.Do(request)
	if err != nil {
		return models.AdaptationPatch{}, Usage{}, fmt.Errorf("openai request failed: %w", err)
	}
	defer response.Body.Close()

	rawBody, err := io.ReadAll(response.Body)
	if err != nil {
		return models.AdaptationPatch{}, Usage{}, fmt.Errorf("read openai response: %w", err)
	}
	if response.StatusCode >= 300 {
		return models.AdaptationPatch{}, Usage{}, fmt.Errorf("openai status %d: %s", response.StatusCode, strings.TrimSpace(string(rawBody)))
	}

	var parsed struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
		Usage struct {
			PromptTokens     int64 `json:"prompt_tokens"`
			CompletionTokens int64 `json:"completion_tokens"`
			TotalTokens      int64 `json:"total_tokens"`
		} `json:"usage"`
	}
	if err := json.Unmarshal(rawBody, &parsed); err != nil {
		return models.AdaptationPatch{}, Usage{}, fmt.Errorf("decode openai response: %w", err)
	}
	if len(parsed.Choices) == 0 {
		return models.AdaptationPatch{}, Usage{}, fmt.Errorf("openai response had no choices")
	}

	var patch models.AdaptationPatch
	if err := json.Unmarshal([]byte(parsed.Choices[0].Message.Content), &patch); err != nil {
		return models.AdaptationPatch{}, Usage{}, fmt.Errorf("decode patch payload: %w", err)
	}

	usage := Usage{
		PromptTokens:     parsed.Usage.PromptTokens,
		CompletionTokens: parsed.Usage.CompletionTokens,
		TotalTokens:      parsed.Usage.TotalTokens,
		EstimatedCostUSD: estimateCostUSD(parsed.Usage.PromptTokens, parsed.Usage.CompletionTokens),
	}
	return patch, usage, nil
}

func adaptationPatchSchema() map[string]any {
	return map[string]any{
		"type":                 "object",
		"additionalProperties": false,
		"required": []string{
			"strategy",
			"summary",
			"overrideCss",
			"attributeEdits",
			"preservedNodeIds",
			"confidence",
			"warnings",
		},
		"properties": map[string]any{
			"strategy":    map[string]any{"type": "string", "enum": []string{"css_override"}},
			"summary":     map[string]any{"type": "string"},
			"overrideCss": map[string]any{"type": "string"},
			"confidence":  map[string]any{"type": "number"},
			"warnings": map[string]any{
				"type":  "array",
				"items": map[string]any{"type": "string"},
			},
			"preservedNodeIds": map[string]any{
				"type":  "array",
				"items": map[string]any{"type": "string"},
			},
			"attributeEdits": map[string]any{
				"type": "array",
				"items": map[string]any{
					"type":                 "object",
					"additionalProperties": false,
					"required":             []string{"nodeId", "name", "value"},
					"properties": map[string]any{
						"nodeId": map[string]any{"type": "string"},
						"name":   map[string]any{"type": "string"},
						"value":  map[string]any{"type": "string"},
					},
				},
			},
		},
	}
}

func estimateCostUSD(promptTokens, completionTokens int64) float64 {
	// Placeholder estimation for observability only.
	return float64(promptTokens)*0.000002 + float64(completionTokens)*0.000008
}
