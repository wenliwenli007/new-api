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

// Package officialprice 提供模型官方基准价的统一存储与查询。
//
// 设计口径（与运营约定一致）：
//   - 存储语义为 USD/1M tokens（官方上游报价的原始口径），
//     与管理端 ModelRatio 的美元语义对齐；
//   - 展示端换算（×usd_exchange_rate 显示人民币）由前端完成；
//   - 渠道编辑页的「价格倍率 × 官方基准价」联动与 /market 官方价表
//     共用本包数据，写入口为 ratio_sync 同步管道（需求 A）。
package officialprice

import (
	"encoding/json"
	"sort"
	"strings"
	"sync"

	"github.com/QuantumNous/new-api/setting/config"
)

// OfficialPrice 单个模型的官方基准价（USD/1M tokens）。
type OfficialPrice struct {
	Input        float64 `json:"input"`
	Output       float64 `json:"output"`
	CachedInput  float64 `json:"cached_input,omitempty"`
	CacheWrite   float64 `json:"cache_write,omitempty"`
	SourceURL    string  `json:"source_url,omitempty"`
	SourcePreset string  `json:"source_preset,omitempty"`
	VerifiedOn   string  `json:"verified_on,omitempty"`
}

// Config 以 JSON 字符串存于 options 表（键 official_pricing.*），
// 复用 config.GlobalConfig 的注册/加载/更新闭环。
type Config struct {
	PricesJSON string `json:"prices_json"` // map[model]OfficialPrice 的 JSON 串
}

var defaultConfig = Config{PricesJSON: "{}"}

var (
	configInstance = defaultConfig
	parsed         map[string]OfficialPrice
	parsedMutex    sync.RWMutex
)

func init() {
	config.GlobalConfig.Register("official_pricing", &configInstance)
}

// GetConfig 返回配置实例（config 框架写入时调用 UpdateConfigFromMap 更新）。
func GetConfig() *Config { return &configInstance }

// Reload 由 option 更新后处理（model/option.go handleConfigUpdate）调用：
// 把 PricesJSON 重新解析进内存索引。JSON 非法时保留上一份有效数据，
// 返回错误由调用方决定是否回写日志。
func Reload(raw string) error {
	stripped := strings.TrimSpace(raw)
	if stripped == "" {
		stripped = "{}"
	}
	var decoded map[string]OfficialPrice
	if err := json.Unmarshal([]byte(stripped), &decoded); err != nil {
		return err
	}
	normalized := make(map[string]OfficialPrice, len(decoded))
	for name, price := range decoded {
		key := strings.ToLower(strings.TrimSpace(name))
		if key == "" {
			continue
		}
		// 拒绝无输入价且无输出价的空记录，防脏数据堆积。
		if price.Input <= 0 && price.Output <= 0 && price.CachedInput <= 0 {
			continue
		}
		normalized[key] = price
	}
	parsedMutex.Lock()
	defer parsedMutex.Unlock()
	parsed = normalized
	return nil
}

// GetPrice 按模型名取官方基准价（大小写不敏感）；未录入返回 false。
func GetPrice(model string) (OfficialPrice, bool) {
	key := strings.ToLower(strings.TrimSpace(model))
	if key == "" {
		return OfficialPrice{}, false
	}
	parsedMutex.RLock()
	defer parsedMutex.RUnlock()
	if parsed == nil {
		return OfficialPrice{}, false
	}
	price, ok := parsed[key]
	return price, ok
}

// AllPrices 返回全量官方价副本。
func AllPrices() map[string]OfficialPrice {
	parsedMutex.RLock()
	defer parsedMutex.RUnlock()
	out := make(map[string]OfficialPrice, len(parsed))
	for k, v := range parsed {
		out[k] = v
	}
	return out
}

// Entry Snapshot 的单条记录。
type Entry struct {
	Model string        `json:"model"`
	Price OfficialPrice `json:"price"`
}

// Snapshot 返回有序快照（市场页/同步对账用）。
func Snapshot() []Entry {
	parsedMutex.RLock()
	defer parsedMutex.RUnlock()
	entries := make([]Entry, 0, len(parsed))
	for name, price := range parsed {
		entries = append(entries, Entry{Model: name, Price: price})
	}
	sort.Slice(entries, func(i, j int) bool { return entries[i].Model < entries[j].Model })
	return entries
}
