package common

import (
	"encoding/hex"
	"testing"
)

func TestSha256(t *testing.T) {
	const input = "new-api"
	want := "964372cb66d3b3ef4b379d217edfa283a5e47a7fc683ccb6b4eef84a33987afe"
	digest := Sha256([]byte(input))
	if _, err := hex.DecodeString(digest); err != nil {
		t.Fatalf("Sha256 returned non-hex output: %v", err)
	}
	if digest != want {
		t.Fatalf("Sha256(%q) = %q, want %q", input, digest, want)
	}
	if digest != Sha256([]byte(input)) {
		t.Fatal("Sha256 is not deterministic")
	}
}
