/*
Copyright (C) 2026 LLM Commons contributors

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
package controller

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/Calcium-Ion/new-api/model"
)

type TodayStatsResult struct {
	TodayCalls       int64 `json:"today_calls"`
	TodayTokens      int64 `json:"today_tokens"`
	OfficialChannels int64 `json:"official_channels"`
}

// GetTodayStats returns anonymous aggregate numbers for the public service
// pulse card: today's consume calls, today's total tokens, and the count of
// enabled channels. Only three scalars — no per-user or per-log details.
func GetTodayStats(c *gin.Context) {
	var result TodayStatsResult

	dayStart := time.Now().Truncate(24 * time.Hour).Unix()
	if err := model.DB.Model(&model.Log{}).
		Where("type = ? AND created_at >= ?", model.LogTypeConsume, dayStart).
		Select("COUNT(*) AS today_calls, COALESCE(SUM(prompt_tokens + completion_tokens), 0) AS today_tokens").
		Scan(&result).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	result.OfficialChannels = model.CountEnabledChannels()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result,
	})
}
