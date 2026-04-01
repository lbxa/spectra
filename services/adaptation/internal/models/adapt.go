package models

type AdaptRequest struct {
	TargetSiteContext TargetSiteContext `json:"targetSiteContext"`
	ComponentPack     ComponentPack     `json:"componentPack"`
}

type TargetSiteContext struct {
	Page           PageContext          `json:"page"`
	Theme          ThemeTokenSet        `json:"theme"`
	InsertionZone  InsertionZoneContext `json:"insertionZone"`
	NativeExemplars []NativeExemplar     `json:"nativeExemplars"`
	HardConstraints HardConstraints      `json:"hardConstraints"`
	Metadata        ContextMetadata      `json:"metadata"`
}

type PageContext struct {
	Origin   string `json:"origin"`
	Pathname string `json:"pathname"`
	Title    string `json:"title"`
}

type ThemeTokenSet struct {
	Colors       []string  `json:"colors"`
	FontFamilies []string  `json:"fontFamilies"`
	SpacingPx    []float64 `json:"spacingPx"`
	RadiusPx     []float64 `json:"radiusPx"`
	Shadows      []string  `json:"shadows"`
}

type InsertionZoneContext struct {
	TagName        string  `json:"tagName"`
	Display        string  `json:"display"`
	Color          string  `json:"color"`
	BackgroundColor string  `json:"backgroundColor"`
	FontFamily     string  `json:"fontFamily"`
	FontSizePx     float64 `json:"fontSizePx"`
	LineHeightPx   float64 `json:"lineHeightPx"`
	BorderRadiusPx float64 `json:"borderRadiusPx"`
}

type NativeExemplar struct {
	TagName    string               `json:"tagName"`
	ClassName  string               `json:"className"`
	TextSnippet string               `json:"textSnippet"`
	Styles     NativeExemplarStyles `json:"styles"`
}

type NativeExemplarStyles struct {
	Color          string  `json:"color"`
	BackgroundColor string  `json:"backgroundColor"`
	BorderRadiusPx float64 `json:"borderRadiusPx"`
	FontFamily     string  `json:"fontFamily"`
	FontWeight     string  `json:"fontWeight"`
	FontSizePx     float64 `json:"fontSizePx"`
	PaddingX       float64 `json:"paddingX"`
	PaddingY       float64 `json:"paddingY"`
}

type HardConstraints struct {
	MaxPatchCSSBytes int      `json:"maxPatchCssBytes"`
	ProtectedNodeIDs []string `json:"protectedNodeIds"`
	ForbiddenPatterns []string `json:"forbiddenPatterns"`
}

type ContextMetadata struct {
	ExtractedAt      string `json:"extractedAt"`
	ThemeFingerprint string `json:"themeFingerprint"`
}

type ComponentPack struct {
	WrapperRootID   string   `json:"wrapperRootId"`
	SemanticRoleHint string   `json:"semanticRoleHint"`
	NormalizedHTML  string   `json:"normalizedHtml"`
	BaseCSS         string   `json:"baseCss"`
	StableNodeIDs   []string `json:"stableNodeIds"`
	ProtectedNodeIDs []string `json:"protectedNodeIds"`
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

type TokenUsage struct {
	PromptTokens     int `json:"promptTokens"`
	CompletionTokens int `json:"completionTokens"`
	TotalTokens      int `json:"totalTokens"`
}
