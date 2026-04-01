package adapt

import (
	"errors"
	"fmt"
	"io"
	"strings"
	"unicode/utf8"

	"github.com/tdewolff/parse/v2"
	"github.com/tdewolff/parse/v2/css"

	"spectra/services/adaptation/internal/models"
)

var allowedAttributeEditNames = map[string]struct{}{
	"class":        {},
	"style":        {},
	"aria-label":   {},
	"aria-hidden":  {},
	"data-size":    {},
	"data-variant": {},
}

func ValidateRequest(request models.AdaptRequest) error {
	if strings.TrimSpace(request.TargetSiteContext.Page.Origin) == "" {
		return errors.New("targetSiteContext.page.origin is required")
	}
	if strings.TrimSpace(request.ComponentPack.WrapperRootID) == "" {
		return errors.New("componentPack.wrapperRootId is required")
	}
	if strings.TrimSpace(request.ComponentPack.NormalizedHTML) == "" {
		return errors.New("componentPack.normalizedHtml is required")
	}
	if len(request.ComponentPack.StableNodeIDs) == 0 {
		return errors.New("componentPack.stableNodeIds must not be empty")
	}
	return nil
}

func ValidatePatch(request models.AdaptRequest, patch models.AdaptationPatch) error {
	if patch.Strategy != "css_override" {
		return errors.New("strategy must be css_override")
	}
	if strings.TrimSpace(patch.Summary) == "" {
		return errors.New("summary is required")
	}
	if patch.Confidence < 0 || patch.Confidence > 1 {
		return errors.New("confidence must be between 0 and 1")
	}

	overrideCSSBytes := len([]byte(patch.OverrideCSS))
	maxPatchBytes := request.TargetSiteContext.HardConstraints.MaxPatchCSSBytes
	if maxPatchBytes <= 0 {
		maxPatchBytes = 16000
	}
	if overrideCSSBytes > maxPatchBytes {
		return fmt.Errorf("overrideCss exceeds maxPatchCssBytes: %d > %d", overrideCSSBytes, maxPatchBytes)
	}

	if err := validateForbiddenPatterns(patch.OverrideCSS); err != nil {
		return err
	}
	if err := validateCSSSyntax(patch.OverrideCSS); err != nil {
		return err
	}
	if !selectorsAreScoped(patch.OverrideCSS, request.ComponentPack.WrapperRootID) {
		return errors.New("overrideCss contains selectors not scoped to wrapperRootId")
	}
	if err := validateAttributeEdits(request.ComponentPack.StableNodeIDs, patch.AttributeEdits); err != nil {
		return err
	}
	if err := validateProtectedNodePreservation(
		request.ComponentPack.ProtectedNodeIDs,
		patch.PreservedNodeIDs,
	); err != nil {
		return err
	}
	return nil
}

func validateForbiddenPatterns(input string) error {
	lower := strings.ToLower(input)
	for _, forbidden := range []string{"<script", "javascript:", "@import", "url(http", "url(https"} {
		if strings.Contains(lower, forbidden) {
			return fmt.Errorf("payload contains forbidden pattern: %s", forbidden)
		}
	}
	return nil
}

func validateAttributeEdits(stableNodeIDs []string, edits []models.AttributeEdit) error {
	stableNodeIDSet := make(map[string]struct{}, len(stableNodeIDs))
	for _, nodeID := range stableNodeIDs {
		stableNodeIDSet[nodeID] = struct{}{}
	}
	for _, edit := range edits {
		if _, ok := stableNodeIDSet[edit.NodeID]; !ok {
			return fmt.Errorf("attribute edit references unknown nodeId: %s", edit.NodeID)
		}
		if _, ok := allowedAttributeEditNames[strings.ToLower(strings.TrimSpace(edit.Name))]; !ok {
			return fmt.Errorf("attribute edit name not allowed: %s", edit.Name)
		}
		if !utf8.ValidString(edit.Value) {
			return fmt.Errorf("attribute edit value is not valid utf-8 for nodeId: %s", edit.NodeID)
		}
		if err := validateForbiddenPatterns(edit.Value); err != nil {
			return fmt.Errorf("attribute edit contains forbidden content for nodeId %s: %w", edit.NodeID, err)
		}
	}
	return nil
}

func validateProtectedNodePreservation(protectedNodeIDs []string, preservedNodeIDs []string) error {
	preserved := make(map[string]struct{}, len(preservedNodeIDs))
	for _, id := range preservedNodeIDs {
		preserved[id] = struct{}{}
	}
	for _, protectedID := range protectedNodeIDs {
		if _, ok := preserved[protectedID]; !ok {
			return fmt.Errorf("protected node not preserved: %s", protectedID)
		}
	}
	return nil
}

func validateCSSSyntax(source string) error {
	if strings.TrimSpace(source) == "" {
		return nil
	}
	input := parse.NewInput(strings.NewReader(source))
	parser := css.NewParser(input, false)
	for {
		grammar, _, data := parser.Next()
		if grammar == css.ErrorGrammar {
			parseErr := parser.Err()
			if parseErr != nil && !errors.Is(parseErr, io.EOF) {
				return fmt.Errorf("invalid css: %w", parseErr)
			}
			return nil
		}
		if grammar == css.QualifiedRuleGrammar && len(data) == 0 {
			return errors.New("invalid css: empty qualified rule")
		}
	}
}
