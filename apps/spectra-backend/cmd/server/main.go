package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/joho/godotenv"
	"github.com/lbxa/spectra/apps/spectra-backend/internal/adapt"
	"github.com/lbxa/spectra/apps/spectra-backend/internal/config"
	serverhttp "github.com/lbxa/spectra/apps/spectra-backend/internal/http"
	"github.com/lbxa/spectra/apps/spectra-backend/internal/llm"
	"github.com/lbxa/spectra/apps/spectra-backend/internal/observability"
)

func main() {
	_ = godotenv.Load()
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config error: %v", err)
	}
	logger := observability.NewLogger()
	openAIClient := llm.NewOpenAIClient(
		cfg.OpenAIAPIKey,
		cfg.OpenAIModel,
		cfg.RequestTimeout,
	)
	validator := adapt.NewValidator(20000)
	service := adapt.NewService(openAIClient, validator, logger)
	router := serverhttp.NewRouter(logger, service)

	server := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           router,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      20 * time.Second,
	}
	logger.Info("server_starting", "addr", server.Addr, "route", "POST /v1/adapt")

	go func() {
		if listenErr := server.ListenAndServe(); listenErr != nil && listenErr != http.ErrServerClosed {
			log.Fatalf("server error: %v", listenErr)
		}
	}()

	waitForShutdown(server)
}

func waitForShutdown(server *http.Server) {
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_ = server.Shutdown(ctx)
}
