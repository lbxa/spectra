package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"spectra/services/adaptation/internal/adapt"
	"spectra/services/adaptation/internal/config"
	httpx "spectra/services/adaptation/internal/http"
	"spectra/services/adaptation/internal/llm"
	"spectra/services/adaptation/internal/observability"
)

func main() {
	cfg := config.Load()
	logger := observability.NewLogger()

	llmClient := llm.NewClient(cfg.LLM)
	adaptService := adapt.NewService(logger, llmClient)
	router := httpx.NewRouter(logger, adaptService)

	server := &http.Server{
		Addr:         cfg.HTTP.Address,
		Handler:      router,
		ReadTimeout:  cfg.HTTP.ReadTimeout,
		WriteTimeout: cfg.HTTP.WriteTimeout,
	}

	go func() {
		logger.Info("adaptation_service_starting", slog.String("address", cfg.HTTP.Address))
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("adaptation_service_failed", slog.String("error", err.Error()))
			os.Exit(1)
		}
	}()

	waitForShutdown(logger, server, cfg.HTTP.ShutdownTimeout)
}

func waitForShutdown(logger *slog.Logger, server *http.Server, shutdownTimeout time.Duration) {
	stopSignals := make(chan os.Signal, 1)
	signal.Notify(stopSignals, syscall.SIGTERM, syscall.SIGINT)
	<-stopSignals

	logger.Info("adaptation_service_shutdown_requested")

	ctx, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		logger.Error("adaptation_service_shutdown_failed", slog.String("error", err.Error()))
		return
	}

	logger.Info("adaptation_service_stopped")
}
