package adapt

import (
	"strings"
)

func selectorsAreScoped(css string) bool {
	return len(firstUnscopedSelectors(css, 1)) == 0
}

func firstUnscopedSelectors(css string, limit int) []string {
	if limit <= 0 {
		return []string{}
	}
	result := make([]string, 0, limit)
	for _, block := range iterateTopLevelBlocks(css) {
		selectorBlock := strings.TrimSpace(block.selector)
		if selectorBlock == "" || strings.HasPrefix(selectorBlock, "@") {
			continue
		}

		parts := strings.Split(selectorBlock, ",")
		for _, selector := range parts {
			trimmed := strings.TrimSpace(selector)
			if trimmed == "" || isScopedSelector(trimmed) {
				continue
			}
			result = append(result, trimmed)
			if len(result) >= limit {
				return result
			}
		}
	}
	return result
}

func isScopedSelector(selector string) bool {
	return strings.Contains(selector, ":scope") || strings.Contains(selector, "[data-spectra")
}

type topLevelBlock struct {
	selector string
	body     string
}

func iterateTopLevelBlocks(css string) []topLevelBlock {
	blocks := make([]topLevelBlock, 0)
	index := 0
	for index < len(css) {
		openOffset := strings.IndexByte(css[index:], '{')
		if openOffset < 0 {
			break
		}

		openIndex := index + openOffset
		selector := css[index:openIndex]
		closeIndex := findMatchingBrace(css, openIndex)
		if closeIndex < 0 {
			break
		}

		blocks = append(blocks, topLevelBlock{
			selector: selector,
			body:     css[openIndex : closeIndex+1],
		})

		index = closeIndex + 1
	}
	return blocks
}

func findMatchingBrace(css string, openIndex int) int {
	depth := 0
	for index := openIndex; index < len(css); index++ {
		switch css[index] {
		case '{':
			depth++
		case '}':
			depth--
			if depth == 0 {
				return index
			}
			if depth < 0 {
				return -1
			}
		}
	}
	return -1
}
