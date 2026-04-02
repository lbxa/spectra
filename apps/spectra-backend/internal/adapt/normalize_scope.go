package adapt

import "strings"

func normalizeTopLevelScopeSelectors(css string) string {
	if strings.TrimSpace(css) == "" {
		return css
	}

	blocks := iterateTopLevelBlocks(css)
	if len(blocks) == 0 {
		return css
	}

	var result strings.Builder
	index := 0
	for _, block := range blocks {
		openOffset := strings.Index(css[index:], block.selector+block.body)
		if openOffset < 0 {
			return css
		}

		openIndex := index + openOffset
		result.WriteString(css[index:openIndex])
		result.WriteString(normalizeSelectorBlock(block.selector))
		result.WriteString(block.body)
		index = openIndex + len(block.selector) + len(block.body)
	}

	result.WriteString(css[index:])
	return result.String()
}

func normalizeSelectorBlock(selectorBlock string) string {
	trimmed := strings.TrimSpace(selectorBlock)
	if trimmed == "" || strings.HasPrefix(trimmed, "@") {
		return selectorBlock
	}

	parts := strings.Split(selectorBlock, ",")
	for index, selector := range parts {
		candidate := strings.TrimSpace(selector)
		if candidate == "" || isScopedSelector(candidate) {
			parts[index] = candidate
			continue
		}
		parts[index] = ":scope " + candidate
	}

	return strings.Join(parts, ", ")
}
