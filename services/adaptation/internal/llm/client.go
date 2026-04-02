package llm

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"spectra/services/adaptation/internal/config"
	"spectra/services/adaptation/internal/models"
)

type PromptPayload struct {
	System    string
	Developer string
	UserJSON  string
}

type Client struct {
	httpClient *http.Client
	cfg        config.LLMConfig
}

func NewClient(cfg config.LLMConfig) *Client {
	return &Client{
		httpClient: &http.Client{Timeout: cfg.Timeout},
		cfg:        cfg,
	}
}

type usageEnvelope struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

type chatRequest struct {
	Model       string        `json:"model"`
	Temperature float64       `json:"temperature"`
	MaxTokens   int           `json:"max_tokens"`
	ResponseFmt responseFormat `json:"response_format"`
	Messages    []chatMessage `json:"messages"`
}

type responseFormat struct {
	Type string `json:"type"`
}

type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type chatResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Usage usageEnvelope `json:"usage"`
}

func (c *Client) GeneratePatch(prompt PromptPayload) (models.AdaptationPatch, models.TokenUsage, error) {
	if strings.TrimSpace(c.cfg.APIKey) == "" {
		return fallbackPatch(prompt)
	}

	requestBody := chatRequest{
		Model:       c.cfg.Model,
		Temperature: c.cfg.Temperature,
		MaxTokens:   c.cfg.MaxTokens,
		ResponseFmt: responseFormat{Type: "json_object"},
		Messages: []chatMessage{
			{Role: "system", Content: prompt.System},
			{Role: "developer", Content: prompt.Developer},
			{Role: "user", Content: prompt.UserJSON},
		},
	}
	bodyBytes, err := json.Marshal(requestBody)
	if err != nil {
		return models.AdaptationPatch{}, models.TokenUsage{}, fmt.Errorf("marshal llm request: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), c.cfg.Timeout)
	defer cancel()
	httpRequest, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		c.cfg.BaseURL+"/chat/completions",
		bytes.NewReader(bodyBytes),
	)
	if err != nil {
		return models.AdaptationPatch{}, models.TokenUsage{}, fmt.Errorf("create llm request: %w", err)
	}
	httpRequest.Header.Set("content-type", "application/json")
	httpRequest.Header.Set("authorization", "Bearer "+c.cfg.APIKey)

	response, err := c.httpClient.Do(httpRequest)
	if err != nil {
		return models.AdaptationPatch{}, models.TokenUsage{}, fmt.Errorf("llm request failed: %w", err)
	}
	defer response.Body.Close()

	if response.StatusCode >= 400 {
		responseBody, _ := io.ReadAll(response.Body)
		return models.AdaptationPatch{}, models.TokenUsage{}, fmt.Errorf(
			"llm returned status %d: %s",
			response.StatusCode,
			strings.TrimSpace(string(responseBody)),
		)
	}

	var decoded chatResponse
	if err := json.NewDecoder(response.Body).Decode(&decoded); err != nil {
		return models.AdaptationPatch{}, models.TokenUsage{}, fmt.Errorf("decode llm response: %w", err)
	}
	if len(decoded.Choices) == 0 {
		return models.AdaptationPatch{}, models.TokenUsage{}, fmt.Errorf("llm returned no choices")
	}

	var patch models.AdaptationPatch
	content := normalizeJSONContent(decoded.Choices[0].Message.Content)
	if err := json.Unmarshal([]byte(content), &patch); err != nil {
		return models.AdaptationPatch{}, models.TokenUsage{}, fmt.Errorf("decode patch json: %w", err)
	}

	return patch, models.TokenUsage{
		PromptTokens:     decoded.Usage.PromptTokens,
		CompletionTokens: decoded.Usage.CompletionTokens,
		TotalTokens:      decoded.Usage.TotalTokens,
	}, nil
}

func fallbackPatch(prompt PromptPayload) (models.AdaptationPatch, models.TokenUsage, error) {
	request, err := decodeFallbackRequest(prompt.UserJSON)
	if err != nil {
		return models.AdaptationPatch{}, models.TokenUsage{}, fmt.Errorf("decode fallback request payload: %w", err)
	}
	wrapperSelector := "#" + request.ComponentPack.WrapperRootID
	insertionZone := request.TargetSiteContext.InsertionZone
	color := nonEmptyOrFallback(insertionZone.Color, "inherit")
	backgroundColor := nonEmptyOrFallback(insertionZone.BackgroundColor, "transparent")
	fontFamily := nonEmptyOrFallback(insertionZone.FontFamily, "inherit")
	fontSize := pxOrFallback(insertionZone.FontSizePx, "inherit")
	lineHeight := pxOrFallback(insertionZone.LineHeightPx, "inherit")
	borderRadius := pxOrFallback(insertionZone.BorderRadiusPx, "0px")
	display := nonEmptyOrFallback(insertionZone.Display, "block")

		overrideCSS := strings.Join([]string{
		wrapperSelector + " { " +
			"display: " + display + "; " +
			"color: " + color + "; " +
			"background-color: " + backgroundColor + "; " +
			"font-family: " + fontFamily + "; " +
			"font-size: " + fontSize + "; " +
			"line-height: " + lineHeight + "; " +
			"border-radius: " + borderRadius + "; " +
			"box-shadow: none; " +
			"border: 0; " +
			"margin: 0; " +
			"padding: 0; " +
			"transition: color 180ms ease, background-color 180ms ease; " +
			"}",
		wrapperSelector + " :where(*):not(svg):not(path):not(g) { " +
			"font-family: inherit; " +
			"color: inherit; " +
			"line-height: inherit; " +
			"}",
		wrapperSelector + " :where(button):not(svg), " +
			wrapperSelector + " :where(a):not(svg), " +
			wrapperSelector + " :where(input), " +
			wrapperSelector + " :where(select), " +
			wrapperSelector + " :where(textarea), " +
			wrapperSelector + " :where([role=\"button\"]), " +
			wrapperSelector + " :where([role=\"link\"]) { " +
			"font: inherit; " +
			"color: inherit; " +
			"background-color: transparent; " +
			"border-radius: " + borderRadius + "; " +
			"}",
	}, "\n")

	patch := models.AdaptationPatch{
		Strategy:      "css_override",
		Summary:       "Applied conservative fallback adaptation",
		OverrideCSS:   overrideCSS,
		AttributeEdits: []models.AttributeEdit{},
		PreservedNodeIDs: append([]string{}, request.ComponentPack.ProtectedNodeIDs...),
		Confidence:      0.58,
		Warnings: []string{
			"LLM API key not configured; deterministic fallback adaptation was used",
		},
	}
	return patch, models.TokenUsage{
		PromptTokens:     0,
		CompletionTokens: 0,
		TotalTokens:      0,
	}, nil
}

func normalizeJSONContent(content string) string {
	trimmed := strings.TrimSpace(content)
	trimmed = strings.TrimPrefix(trimmed, "```json")
	trimmed = strings.TrimPrefix(trimmed, "```")
	trimmed = strings.TrimSuffix(trimmed, "```")
	return strings.TrimSpace(trimmed)
}

func decodeFallbackRequest(payload string) (models.AdaptRequest, error) {
	var direct models.AdaptRequest
	if err := json.Unmarshal([]byte(payload), &direct); err == nil && direct.ComponentPack.WrapperRootID != "" {
		return direct, nil
	}

	var repairEnvelope struct {
		Request models.AdaptRequest `json:"request"`
	}
	if err := json.Unmarshal([]byte(payload), &repairEnvelope); err != nil {
		return models.AdaptRequest{}, err
	}
	return repairEnvelope.Request, nil
}

func nonEmptyOrFallback(value string, fallback string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return fallback
	}
	return trimmed
}

func pxOrFallback(value float64, fallback string) string {
	if value <= 0 {
		return fallback
	}
	return fmt.Sprintf("%.2fpx", value)
}
