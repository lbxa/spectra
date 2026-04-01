package httpx

import (
	"log/slog"

	"github.com/gin-gonic/gin"

	"spectra/services/adaptation/internal/adapt"
	"spectra/services/adaptation/internal/http/handlers"
	"spectra/services/adaptation/internal/http/middleware"
)

func NewRouter(logger *slog.Logger, service *adapt.Service) *gin.Engine {
	router := gin.New()
	router.Use(middleware.RequestID())
	router.Use(middleware.Logging(logger))
	router.Use(middleware.Recovery(logger))

	adaptHandler := handlers.NewAdaptHandler(logger, service)
	v1 := router.Group("/v1")
	v1.POST("/adapt", adaptHandler.Handle)

	return router
}
