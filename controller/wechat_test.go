package controller

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestValidateWeChatServerAddress(t *testing.T) {
	tests := []struct {
		name    string
		address string
		valid   bool
	}{
		{name: "public IPv4", address: "https://1.1.1.1", valid: true},
		{name: "public IPv6", address: "https://[2606:4700:4700::1111]", valid: true},
		{name: "private IPv4", address: "http://192.168.1.10", valid: false},
		{name: "loopback IPv4", address: "http://127.0.0.1", valid: false},
		{name: "loopback IPv6", address: "http://[::1]", valid: false},
		{name: "missing scheme", address: "example.com", valid: false},
		{name: "userinfo", address: "https://user:password@1.1.1.1", valid: false},
		{name: "non-standard port", address: "https://1.1.1.1:8443", valid: false},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			validated, err := validateWeChatServerAddress(test.address)
			if test.valid {
				require.NoError(t, err)
				require.NotNil(t, validated)
				return
			}
			require.Error(t, err)
			require.Nil(t, validated)
		})
	}
}
