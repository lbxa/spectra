package models

type TargetSiteContext struct {
	URL               string            `json:"url" binding:"required,url"`
	Title             string            `json:"title"`
	ThemeMode         string            `json:"themeMode"`
	PrimaryFontFamily string            `json:"primaryFontFamily"`
	ColorTokens       map[string]string `json:"colorTokens"`
	RootSelector      string            `json:"rootSelector"`
	ProtectedNodeIDs  []string          `json:"protectedNodeIds"`
}

type ComponentPack struct {
	ComponentID string `json:"componentId" binding:"required"`
	Title       string `json:"title"`
	HTML        string `json:"html" binding:"required"`
	CSSText     string `json:"cssText"`
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
