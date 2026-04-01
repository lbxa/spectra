package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	HTTP HTTPConfig
	LLM  LLMConfig
}

type HTTPConfig struct {
	Address         string
	ReadTimeout     time.Duration
	WriteTimeout    time.Duration
	ShutdownTimeout time.Duration
}

type LLMConfig struct {
	BaseURL     string
	APIKey      string
	Model       string
	Temperature float64
	MaxTokens   int
	Timeout     time.Duration
}

func Load() Config {
	return Config{
		HTTP: HTTPConfig{
			Address:         getEnv("ADAPT_HTTP_ADDRESS", ":8090"),
			ReadTimeout:     getEnvDuration("ADAPT_HTTP_READ_TIMEOUT", 10*time.Second),
			WriteTimeout:    getEnvDuration("ADAPT_HTTP_WRITE_TIMEOUT", 25*time.Second),
			ShutdownTimeout: getEnvDuration("ADAPT_HTTP_SHUTDOWN_TIMEOUT", 10*time.Second),
		},
		LLM: LLMConfig{
			BaseURL:     trimTrailingSlash(getEnv("ADAPT_LLM_BASE_URL", "https://api.openai.com/v1")),
			APIKey:      getEnv("ADAPT_LLM_API_KEY", ""),
			Model:       getEnv("ADAPT_LLM_MODEL", "gpt-4.1"),
			Temperature: getEnvFloat("ADAPT_LLM_TEMPERATURE", 0.1),
			MaxTokens:   getEnvInt("ADAPT_LLM_MAX_TOKENS", 1200),
			Timeout:     getEnvDuration("ADAPT_LLM_TIMEOUT", 20*time.Second),
		},
	}
}

func getEnv(key string, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}

func getEnvInt(key string, fallback int) int {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(raw)
	if err != nil {
		return fallback
	}
	return parsed
}

func getEnvFloat(key string, fallback float64) float64 {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback
	}
	parsed, err := strconv.ParseFloat(raw, 64)
	if err != nil {
		return fallback
	}
	return parsed
}

func getEnvDuration(key string, fallback time.Duration) time.Duration {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback
	}
	parsed, err := time.ParseDuration(raw)
	if err != nil {
		return fallback
	}
	return parsed
}

func trimTrailingSlash(value string) string {
	return strings.TrimRight(value, "/")
}
