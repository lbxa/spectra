package models

type TargetSiteContext struct {
	URL               string            `json:"url" binding:"required,url"`
	Title             string            `json:"title"`
	ThemeMode         string            `json:"themeMode"`
	PrimaryFontFamily string            `json:"primaryFontFamily"`
	ColorTokens       map[string]string `json:"colorTokens"`
	RootSelector      string            `json:"rootSelector"`
	ProtectedNodeIDs  []string          `json:"protectedNodeIds"`
	InsertionContext  InsertionContext  `json:"insertionContext"`
	NativeExemplars   []NativeExemplar  `json:"nativeExemplars"`
	Metadata          TargetMetadata    `json:"metadata"`
	HostSceneSummary  HostSceneSummary  `json:"hostSceneSummary"`
}

type ComponentPack struct {
	ComponentID            string                 `json:"componentId" binding:"required"`
	Title                  string                 `json:"title"`
	HTML                   string                 `json:"html" binding:"required"`
	CSSText                string                 `json:"cssText"`
	StableNodeIDs          []string               `json:"stableNodeIds"`
	SemanticRoleHint       string                 `json:"semanticRoleHint"`
	ProtectedNodeIDs       []string               `json:"protectedNodeIds"`
	WrapperRootID          string                 `json:"wrapperRootId"`
	ComponentIntentSummary ComponentIntentSummary `json:"componentIntentSummary"`
}

type InsertionContext struct {
	HostTag                 string   `json:"hostTag"`
	HostClasses             []string `json:"hostClasses"`
	NearbyHeading           string   `json:"nearbyHeading"`
	ComputedDisplay         string   `json:"computedDisplay"`
	ComputedColor           string   `json:"computedColor"`
	ComputedBackgroundColor string   `json:"computedBackgroundColor"`
}

type NativeExemplar struct {
	Role    string `json:"role"`
	CSSText string `json:"cssText"`
}

type TargetMetadata struct {
	PageURL          string `json:"pageUrl"`
	PageTitle        string `json:"pageTitle"`
	ThemeFingerprint string `json:"themeFingerprint"`
}

type HostSceneTypography struct {
	BodyFontFamily    string  `json:"bodyFontFamily"`
	BodyFontSizePx    float64 `json:"bodyFontSizePx"`
	BodyLineHeightPx  float64 `json:"bodyLineHeightPx"`
	HeadingScale      float64 `json:"headingScale"`
	CommonFontWeights []int   `json:"commonFontWeights"`
}

type HostSceneColors struct {
	TextPrimary  string `json:"textPrimary"`
	TextMuted    string `json:"textMuted"`
	SurfaceBase  string `json:"surfaceBase"`
	SurfaceMuted string `json:"surfaceMuted"`
	BorderSubtle string `json:"borderSubtle"`
	Accent       string `json:"accent"`
}

type HostSceneSurface struct {
	BorderRadiusPx float64 `json:"borderRadiusPx"`
	HasShadow      bool    `json:"hasShadow"`
}

type HostSceneDensity struct {
	SpacingPx   float64 `json:"spacingPx"`
	Compactness string  `json:"compactness"`
}

type HostSceneSummary struct {
	Typography HostSceneTypography `json:"typography"`
	Colors     HostSceneColors     `json:"colors"`
	Surface    HostSceneSurface    `json:"surface"`
	Density    HostSceneDensity    `json:"density"`
}

type ComponentIntentSummary struct {
	SemanticRole         string  `json:"semanticRole"`
	EmphasisLevel        string  `json:"emphasisLevel"`
	HeadingScale         float64 `json:"headingScale"`
	DominantWeight       int     `json:"dominantWeight"`
	BodyWeight           int     `json:"bodyWeight"`
	HasSurfaceBackground bool    `json:"hasSurfaceBackground"`
	HasSurfaceBorder     bool    `json:"hasSurfaceBorder"`
	HasSurfaceShadow     bool    `json:"hasSurfaceShadow"`
	CornerStyle          string  `json:"cornerStyle"`
	ColorIntent          string  `json:"colorIntent"`
}

type AdaptRequest struct {
	TargetSiteContext TargetSiteContext `json:"targetSiteContext" binding:"required"`
	ComponentPack     ComponentPack     `json:"componentPack" binding:"required"`
}

type AttributeEdit struct {
	NodeID string `json:"nodeId"`
	Name   string `json:"name"`
	Value  string `json:"value"`
}

type AdaptationPatch struct {
	Strategy         string          `json:"strategy"`
	Summary          string          `json:"summary"`
	OverrideCSS      string          `json:"overrideCss"`
	AttributeEdits   []AttributeEdit `json:"attributeEdits"`
	PreservedNodeIDs []string        `json:"preservedNodeIds"`
	Confidence       float64         `json:"confidence"`
	Warnings         []string        `json:"warnings"`
}

type ErrorResponse struct {
	OK               bool              `json:"ok"`
	Code             string            `json:"code"`
	Message          string            `json:"message"`
	RequestID        string            `json:"requestId,omitempty"`
	ValidationIssues []ValidationIssue `json:"validationIssues,omitempty"`
}

type ValidationIssue struct {
	Code    string `json:"code"`
	Field   string `json:"field,omitempty"`
	Message string `json:"message"`
}

type AdaptResponse struct {
	OK    bool            `json:"ok"`
	Patch AdaptationPatch `json:"patch"`
}
