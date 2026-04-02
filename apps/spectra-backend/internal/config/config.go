package config

import (
	"fmt"
	"os"
	"strconv"
	"time"
)

type Config struct {
	Port           string
	OpenAIAPIKey   string
	OpenAIModel    string
	RequestTimeout time.Duration
}

func Load() (Config, error) {
	cfg := Config{
		Port:           getEnv("PORT", "8787"),
		OpenAIAPIKey:   os.Getenv("OPENAI_API_KEY"),
		OpenAIModel:    getEnv("OPENAI_MODEL", "gpt-4.1"),
		RequestTimeout: time.Duration(getEnvInt("REQUEST_TIMEOUT_MS", 45000)) * time.Millisecond,
	}

	if cfg.OpenAIAPIKey == "" {
		return Config{}, fmt.Errorf("OPENAI_API_KEY is required")
	}
	return cfg, nil
}

func getEnv(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}

func getEnvInt(key string, fallback int) int {
	raw := os.Getenv(key)
	if raw == "" {
		return fallback
	}
	value, err := strconv.Atoi(raw)
	if err != nil {
		return fallback
	}
	return value
}
