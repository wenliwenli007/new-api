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
	Models       []string `json:"models"`
	SourcePreset string   `json:"source_preset"`
	SourceURL    string   `json:"source_url"`
}

// upsertOfficialPricingRequest 方案 B 的手工录入端点：
// 按模型逐条覆盖官方基准价，支持 domestic（人民币口径）与
// international（美元口径）两种参照系，供国内官网价维护使用。
type upsertOfficialPricingRequest struct {
	// Region 参照系：domestic（¥/1M）或 international（$/M）；空=international。
	Region string `json:"region"`
	// SourceURL 官网价格页链接（国内官网优先）。
	SourceURL string `json:"source_url"`
	// Records 每模型一条官方价；金额单位由 Region 决定。
	Records []upsertOfficialPriceRecord `json:"records"`
}

type upsertOfficialPriceRecord struct {
	Model       string  `json:"model"`
	Input       float64 `json:"input"`
	Output      float64 `json:"output"`
	CachedInput float64 `json:"cached_input"`
	// CacheWrite 可空；空时按行业惯例等于输入价。
	CacheWrite *float64 `json:"cache_write"`
}

// UpsertOfficialPricing godoc
// POST /api/official_pricing/upsert
//
// 手工维护官方基准价（方案 B）：国内体系模型按各厂国内官网人民币价
// 录入（region=domestic），海外模型按国际官网美元价录入。
// 已有记录直接覆盖；验证 input>0，非法记录拒收整批。
func UpsertOfficialPricing(c *gin.Context) {
	var req upsertOfficialPricingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "请求参数格式错误"})
		return
	}
	if len(req.Records) == 0 || len(req.Records) > maxOfficialPriceRecords {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "记录数为空或超出上限"})
		return
	}

	region := strings.TrimSpace(strings.ToLower(req.Region))
	if region == "" {
		region = "international"
	}
	if region != "domestic" && region != "international" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "region 仅支持 domestic / international"})
		return
	}

	today := time.Now().Format("2006-01-02")
	merged := officialprice.AllPrices()
	upserted := 0

	for _, rec := range req.Records {
		key := strings.ToLower(strings.TrimSpace(rec.Model))
		if key == "" || rec.Input <= 0 || math.IsNaN(rec.Input) || math.IsInf(rec.Input, 0) {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "非法记录：模型名缺失或输入价 ≤ 0（" + rec.Model + "）",
			})
			return
		}
		cacheWrite := rec.Input
		if rec.CacheWrite != nil && *rec.CacheWrite > 0 {
			cacheWrite = *rec.CacheWrite
		}
		merged[key] = officialprice.OfficialPrice{
			Input:        rec.Input,
			Output:       rec.Output,
			CachedInput:  rec.CachedInput,
			CacheWrite:   cacheWrite,
			SourceURL:    req.SourceURL,
			SourcePreset: "manual:" + region,
			VerifiedOn:   today,
			Region:       region,
		}
		upserted++
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

	common.SysLog("official pricing upsert: records=" + strconv.Itoa(upserted) + " region=" + region)
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"upserted": upserted,
			"total":    len(merged),
			"region":   region,
			"verified": today,
		},
		"message": "已更新 " + strconv.Itoa(upserted) + " 个模型的官方基准价（" + region + "）",
	})
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
