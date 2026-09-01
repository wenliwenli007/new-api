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

// controller/official_price.go — 需求 A/B 的官方基准价接口。
//
//	GET  /api/official_pricing          管理端：全量官方价快照（渠道编辑页/市场页数据源）
//	POST /api/official_pricing/import   管理端：把倍率预设(ratio_sync 拉取结果)换算导入官方价表
package controller

import (
	"encoding/json"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/officialprice"
	"github.com/QuantumNous/new-api/setting/ratio_setting"

	"github.com/gin-gonic/gin"
)

const maxOfficialPriceRecords = 2000

// GetOfficialPricing godoc
// GET /api/official_pricing
func GetOfficialPricing(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    officialprice.Snapshot(),
	})
}

// importOfficialPricingRequest 改写请求体：models 为要导入的模型名列表
//（来自 ratio_sync 差异表勾选项）；未传 = 导入快照全量。
type importOfficialPricingRequest struct {
	Models      []string `json:"models"`
	SourcePreset string  `json:"source_preset"`
	SourceURL    string  `json:"source_url"`
}

// ImportOfficialPricing godoc
// POST /api/official_pricing/import
//
// 把全局倍率表(ratio_setting)中的 model_ratio / completion_ratio /
// cache_ratio 换算为官方基准价（USD/1M）写进 official_pricing.prices_json：
//
//	input   = model_ratio × 2
//	output  = input × completion_ratio
//	cached  = input × cache_ratio
//	cache_write = input（无独立倍率字段，按行业惯例等于输入价）
//
// 已有记录且本次换算无输入价(比率≤0)时保留原值，避免一次误导入清库。
func ImportOfficialPricing(c *gin.Context) {
	var req importOfficialPricingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "请求参数格式错误"})
		return
	}
	if len(req.Models) > maxOfficialPriceRecords {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "单次导入模型数超出上限"})
		return
	}

	// 归一化勾选模型名；空列表 = 全量
	wanted := make(map[string]bool, len(req.Models))
	for _, name := range req.Models {
		key := strings.ToLower(strings.TrimSpace(name))
		if key != "" {
			wanted[key] = true
		}
	}
	selectAll := len(wanted) == 0

	ratioSnapshot := ratio_setting.GetModelRatioCopy()
	completionMap := ratio_setting.GetCompletionRatioCopy()
	cacheMap := ratio_setting.GetCacheRatioCopy()

	merged := officialprice.AllPrices()
	today := time.Now().Format("2006-01-02")
	imported := 0

	for name := range ratioSnapshot {
		key := strings.ToLower(strings.TrimSpace(name))
		if key == "" {
			continue
		}
		if !selectAll && !wanted[key] {
			continue
		}
		ratio := ratioSnapshot[name]
		if ratio <= 0 || math.IsNaN(ratio) || math.IsInf(ratio, 0) {
			continue
		}
		input := ratio * 2
		output := input * positiveOrDefault(completionMap[name], 1)
		existing, hasOld := merged[key]

		price := officialprice.OfficialPrice{
			Input:        input,
			Output:       output,
			SourcePreset: req.SourcePreset,
			SourceURL:    req.SourceURL,
			VerifiedOn:   today,
		}
		if cr, ok := cacheMap[name]; ok && cr > 0 {
			price.CachedInput = input * cr
			price.CacheWrite = input
		} else if hasOld {
			// 本次无缓存倍率时沿用旧记录，避免丢信息。
			price.CachedInput = existing.CachedInput
			price.CacheWrite = existing.CacheWrite
		}
		if hasOld {
			if price.SourceURL == "" {
				price.SourceURL = existing.SourceURL
			}
			if price.SourcePreset == "" {
				price.SourcePreset = existing.SourcePreset
			}
		}
		merged[key] = price
		imported++
	}

	if imported == 0 {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "无可导入的模型（勾选模型未配置倍率）"})
		return
	}

	payload, err := json.Marshal(merged)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "官方价表序列化失败"})
		return
	}
	if err := model.UpdateOption("official_pricing.prices_json", string(payload)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "保存官方价表失败：" + err.Error()})
		return
	}

	common.SysLog("official pricing imported: models=" + strconv.Itoa(imported) + " source=" + req.SourcePreset)
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"imported": imported,
			"total":    len(merged),
			"verified": today,
		},
		"message": "已导入 " + strconv.Itoa(imported) + " 个模型的官方基准价",
	})
}

func positiveOrDefault(v, def float64) float64 {
	if v > 0 && !math.IsNaN(v) && !math.IsInf(v, 0) {
		return v
	}
	return def
}
