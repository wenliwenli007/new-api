/*
Copyright (C) 2026 LLM Commons contributors

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.
*/

package officialprice

import (
	"encoding/json"
	"testing"
)

func TestReloadAndLookup(t *testing.T) {
	raw := `{
	  "deepseek-v4-flash": {"input":0.44,"output":1.32,"cached_input":0.02,"verified_on":"2026-09-01"},
	  "GLM-5.2": {"input":0.6,"output":2.0},
	  "bad-model": {"input":0},
	  "": {"input":1}
	}`
	if err := Reload(raw); err != nil {
		t.Fatalf("Reload: %v", err)
	}

	if p, ok := GetPrice("DeepSeek-V4-Flash"); !ok || p.Input != 0.44 {
		t.Fatalf("case-insensitive lookup failed: %+v ok=%v", p, ok)
	}
	if _, ok := GetPrice("glm-5.2"); !ok {
		t.Fatal("uppercase key should be normalized to lowercase")
	}
	if _, ok := GetPrice("bad-model"); ok {
		t.Fatal("zero-priced records must be dropped")
	}
	if _, ok := GetPrice(""); ok {
		t.Fatal("empty model must never match")
	}
	if p, ok := GetPrice("glm-5.2"); !ok || p.Output != 2.0 {
		t.Fatalf("glm lookup failed: %+v", p)
	}
}

func TestReloadKeepsPreviousOnBadJSON(t *testing.T) {
	if err := Reload(`{"m": {"input":1}}`); err != nil {
		t.Fatalf("seed reload: %v", err)
	}
	if err := Reload(`{not-json`); err == nil {
		t.Fatal("invalid JSON must return error")
	}
	if _, ok := GetPrice("m"); !ok {
		t.Fatal("previous valid snapshot must survive a failed reload")
	}
}

func TestReloadEmptyStringResets(t *testing.T) {
	if err := Reload(`{"m": {"input":1}}`); err != nil {
		t.Fatalf("seed reload: %v", err)
	}
	if err := Reload(""); err != nil {
		t.Fatalf("empty string should reset to {}: %v", err)
	}
	if len(AllPrices()) != 0 {
		t.Fatal("empty string must reset snapshot")
	}
}

func TestSnapshotSorted(t *testing.T) {
	if err := Reload(`{"zeta":{"input":1},"alpha":{"input":2},"mid":{"input":3}}`); err != nil {
		t.Fatalf("reload: %v", err)
	}
	entries := Snapshot()
	if len(entries) != 3 {
		t.Fatalf("want 3 entries, got %d", len(entries))
	}
	if entries[0].Model != "alpha" || entries[2].Model != "zeta" {
		t.Fatalf("snapshot not sorted: %v", entries)
	}
}

func TestRoundTripThroughConfigJSON(t *testing.T) {
	// 导入管道写入的是整表 JSON；确认它可被 Reload 原样解析回来。
	table := map[string]OfficialPrice{
		"deepseek-v4-flash": {Input: 0.44, Output: 1.32, CachedInput: 0.02, CacheWrite: 0.44, VerifiedOn: "2026-09-01"},
	}
	payload, err := json.Marshal(table)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	if err := Reload(string(payload)); err != nil {
		t.Fatalf("reload marshalled table: %v", err)
	}
	p, ok := GetPrice("deepseek-v4-flash")
	if !ok || p.CachedInput != 0.02 || p.CacheWrite != 0.44 {
		t.Fatalf("round trip lost cache prices: %+v", p)
	}
}
