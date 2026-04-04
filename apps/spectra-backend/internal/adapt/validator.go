package adapt

import (
	"fmt"
	"strings"

	"github.com/lbxa/spectra/apps/spectra-backend/internal/models"
)

type Validator struct {
	maxPatchBytes int
}

func NewValidator(maxPatchBytes int) *Validator {
	return &Validator{maxPatchBytes: maxPatchBytes}
}

func (v *Validator) Validate(request models.AdaptRequest, patch models.AdaptationPatch) []models.ValidationIssue {
	issues := make([]models.ValidationIssue, 0)

	if patch.Strategy == "" {
		issues = append(issues, models.ValidationIssue{
			Code:    "missing_strategy",
			Field:   "strategy",
			Message: "strategy is required",
		})
	} else if patch.Strategy != "css_override" {
		issues = append(issues, models.ValidationIssue{
			Code:    "invalid_strategy",
			Field:   "strategy",
			Message: "strategy must be css_override",
		})
	}
	if patch.Confidence < 0 || patch.Confidence > 1 {
		issues = append(issues, models.ValidationIssue{
			Code:    "invalid_confidence",
			Field:   "confidence",
			Message: "confidence must be between 0 and 1",
		})
	}
	if len([]byte(patch.OverrideCSS)) > v.maxPatchBytes {
		issues = append(issues, models.ValidationIssue{
			Code:    "patch_too_large",
			Field:   "overrideCss",
			Message: fmt.Sprintf("overrideCss exceeds %d bytes", v.maxPatchBytes),
		})
	}

	if containsForbiddenContent(patch.OverrideCSS) {
		issues = append(issues, models.ValidationIssue{
			Code:    "forbidden_css_content",
			Field:   "overrideCss",
			Message: "overrideCss contains forbidden content",
		})
	}
	if !looksLikeParsableCSS(patch.OverrideCSS) {
		issues = append(issues, models.ValidationIssue{
			Code:    "invalid_css",
			Field:   "overrideCss",
			Message: "overrideCss appears malformed",
		})
	}
	if patch.OverrideCSS != "" && !selectorsAreScoped(patch.OverrideCSS) {
		issues = append(issues, models.ValidationIssue{
			Code:    "unscoped_selector",
			Field:   "overrideCss",
			Message: "selectors must be scoped",
		})
	}

	allowlist := map[string]bool{
		"class":      true,
		"style":      true,
		"aria-label": true,
		"role":       true,
	}
	for _, edit := range patch.AttributeEdits {
		if edit.NodeID == "" {
			issues = append(issues, models.ValidationIssue{
				Code:    "invalid_attribute_edit",
				Field:   "attributeEdits.nodeId",
				Message: "nodeId is required",
			})
		}
		if !allowlist[strings.ToLower(edit.Name)] {
			issues = append(issues, models.ValidationIssue{
				Code:    "attribute_not_allowed",
				Field:   "attributeEdits.name",
				Message: fmt.Sprintf("attribute %q is not allowed", edit.Name),
			})
		}
	}

	protected := make(map[string]struct{}, len(request.TargetSiteContext.ProtectedNodeIDs))
	for _, id := range request.TargetSiteContext.ProtectedNodeIDs {
		protected[id] = struct{}{}
	}
	for _, id := range patch.PreservedNodeIDs {
		if _, ok := protected[id]; !ok {
			issues = append(issues, models.ValidationIssue{
				Code:    "unknown_preserved_node",
				Field:   "preservedNodeIds",
				Message: fmt.Sprintf("preserved node id %q not in request protected nodes", id),
			})
		}
	}

	return issues
}

func containsForbiddenContent(value string) bool {
	normalized := strings.ToLower(value)
	forbiddenSubstrings := []string{
		"<script",
		"javascript:",
		"expression(",
		"@import",
		"url(http://",
		"url(https://",
	}
	for _, forbidden := range forbiddenSubstrings {
		if strings.Contains(normalized, forbidden) {
			return true
		}
	}
	return false
}

func looksLikeParsableCSS(value string) bool {
	if value == "" {
		return true
	}
	var balance int
	for _, runeValue := range value {
		if runeValue == '{' {
			balance++
		} else if runeValue == '}' {
			balance--
			if balance < 0 {
				return false
			}
		}
	}
	return balance == 0
}
