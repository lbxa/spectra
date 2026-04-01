package adapt

import "strings"

func selectorsAreScoped(overrideCSS string, wrapperRootID string) bool {
	trimmed := strings.TrimSpace(overrideCSS)
	if trimmed == "" {
		return true
	}

	requiredScope := "#" + strings.TrimSpace(wrapperRootID)
	if requiredScope == "#" {
		return false
	}

	blocks := strings.Split(trimmed, "}")
	for _, rawBlock := range blocks {
		block := strings.TrimSpace(rawBlock)
		if block == "" {
			continue
		}
		parts := strings.SplitN(block, "{", 2)
		if len(parts) != 2 {
			return false
		}
		selectorText := strings.TrimSpace(parts[0])
		if selectorText == "" {
			continue
		}
		if strings.HasPrefix(selectorText, "@") {
			continue
		}

		selectors := strings.Split(selectorText, ",")
		for _, selector := range selectors {
			normalized := strings.TrimSpace(selector)
			if normalized == "" {
				return false
			}
			if !strings.Contains(normalized, requiredScope) {
				return false
			}
		}
	}

	return true
}
