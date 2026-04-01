package adapt

import "testing"

func TestSelectorsAreScoped(t *testing.T) {
	if !selectorsAreScoped("#spectra-root button { color: red; }", "spectra-root") {
		t.Fatalf("expected scoped selector to be accepted")
	}
	if selectorsAreScoped("button { color: red; }", "spectra-root") {
		t.Fatalf("expected unscoped selector to be rejected")
	}
}
