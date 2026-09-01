package jsplugin

import (
	"bytes"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPluginCLI(t *testing.T) {
	tempDir := t.TempDir()
	t.Chdir(tempDir)
	pluginPath := "fixture.js"
	fixturePath := "fixture.json"
	require.NoError(t, os.WriteFile(filepath.Join(tempDir, pluginPath), []byte(cliFixturePluginSource), 0o600))
	require.NoError(t, os.WriteFile(filepath.Join(tempDir, fixturePath), []byte(`{"unixNow":42,"cases":[{"hook":"value","args":[],"expected":42}]}`), 0o600))

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	assert.Equal(t, 0, RunCLI([]string{"lint", pluginPath}, &stdout, &stderr))
	assert.Contains(t, stdout.String(), "plugin cli-fixture@1.0.0 is valid")
	assert.Empty(t, stderr.String())

	stdout.Reset()
	assert.Equal(t, 0, RunCLI([]string{"test", pluginPath, "--fixture", fixturePath}, &stdout, &stderr))
	assert.Contains(t, stdout.String(), "1/1 cases")
}

func TestResolveCLIPathConfinesTargetsToRoot(t *testing.T) {
	root := t.TempDir()
	require.NoError(t, os.Mkdir(filepath.Join(root, "plugins"), 0o700))
	require.NoError(t, os.WriteFile(filepath.Join(root, "plugins", "plugin.js"), nil, 0o600))
	inside, err := resolveCLIPath(filepath.Join("plugins", "plugin.js"), root)
	require.NoError(t, err)
	assert.Equal(t, filepath.Join(root, "plugins", "plugin.js"), inside)

	_, err = resolveCLIPath(filepath.Join("..", "outside.js"), root)
	assert.Error(t, err)
	_, err = resolveCLIPath(filepath.Join("plugins", "..", "..", "outside.js"), root)
	assert.Error(t, err)
}

func TestPluginCLIRejectsTraversal(t *testing.T) {
	root := t.TempDir()
	outside := filepath.Join(filepath.Dir(root), "outside-plugin.js")
	require.NoError(t, os.WriteFile(outside, []byte(cliFixturePluginSource), 0o600))
	defer os.Remove(outside)

	oldDir, err := os.Getwd()
	require.NoError(t, err)
	require.NoError(t, os.Chdir(root))
	defer os.Chdir(oldDir)

	var stdout, stderr bytes.Buffer
	assert.Equal(t, 1, RunCLI([]string{"lint", filepath.Join("..", filepath.Base(outside))}, &stdout, &stderr))
	assert.Contains(t, stderr.String(), "escapes CLI working directory")
}

const cliFixturePluginSource = `
export const meta = { apiVersion: 1, key: "cli-fixture", name: "CLI Fixture", version: "1.0.0", author: {name: "Test"}, channelTypes: [1003], models: ["fixture-model"], fetchMode: "per_task" };
export function buildSubmitRequest(ctx) { return {url: ctx.baseUrl}; }
export function parseSubmitResponse(ctx, resp) { return {taskId: "task"}; }
export function buildQueryRequest(ctx) { return {url: ctx.baseUrl}; }
export function parseTaskResult(ctx, body) { return body; }
export function value() { return utils.unixNow(); }
`
