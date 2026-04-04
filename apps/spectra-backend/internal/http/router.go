package http

import (
	"log/slog"

	"github.com/gin-gonic/gin"
	"github.com/lbxa/spectra/apps/spectra-backend/internal/adapt"
	"github.com/lbxa/spectra/apps/spectra-backend/internal/http/handlers"
	"github.com/lbxa/spectra/apps/spectra-backend/internal/http/middleware"
)

func NewRouter(logger *slog.Logger, service *adapt.Service) *gin.Engine {
	engine := gin.New()
	engine.Use(middleware.RequestLogger(logger))
	engine.Use(middleware.Recovery(logger))
	adaptHandler := handlers.NewAdaptHandler(service, logger)
	v1 := engine.Group("/v1")
	v1.POST("/adapt", adaptHandler.PostAdapt)
	return engine
}
