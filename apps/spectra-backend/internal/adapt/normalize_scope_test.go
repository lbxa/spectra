package adapt

import "testing"

func TestNormalizeTopLevelScopeSelectors(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "prefixes_single_unscoped_selector",
			input:    ".btn{color:red;}",
			expected: ":scope .btn{color:red;}",
		},
		{
			name:     "preserves_scoped_selector",
			input:    ":scope .btn{color:red;}",
			expected: ":scope .btn{color:red;}",
		},
		{
			name:     "normalizes_mixed_comma_selectors",
			input:    ".btn, :scope .chip, [data-spectra-preview-content='true'] .badge{color:red;}",
			expected: ":scope .btn, :scope .chip, [data-spectra-preview-content='true'] .badge{color:red;}",
		},
		{
			name:     "does_not_rewrite_at_rule_header",
			input:    "@media (prefers-color-scheme: dark) {.btn{color:white;}}",
			expected: "@media (prefers-color-scheme: dark) {.btn{color:white;}}",
		},
		{
			name:     "empty_css_noop",
			input:    "",
			expected: "",
		},
	}

	for _, testCase := range tests {
		t.Run(testCase.name, func(t *testing.T) {
			actual := normalizeTopLevelScopeSelectors(testCase.input)
			if actual != testCase.expected {
				t.Fatalf("expected %q, got %q", testCase.expected, actual)
			}
		})
	}
}

func TestFirstUnscopedSelectorsReturnsSample(t *testing.T) {
	css := ".btn{color:red;} :scope .chip{color:blue;} button{font-weight:700;}"
	got := firstUnscopedSelectors(css, 2)
	if len(got) != 2 {
		t.Fatalf("expected 2 unscoped selectors, got %d", len(got))
	}
	if got[0] != ".btn" || got[1] != "button" {
		t.Fatalf("unexpected selector sample: %v", got)
	}
}
