package controller

import (
	"errors"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"

	"github.com/gin-gonic/gin"
)

type wechatLoginResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Data    string `json:"data"`
}

var blockedWeChatServerNetworks = func() []net.IPNet {
	cidrs := []string{
		"0.0.0.0/8", "10.0.0.0/8", "100.64.0.0/10", "127.0.0.0/8",
		"169.254.0.0/16", "172.16.0.0/12", "192.0.0.0/24", "192.0.2.0/24",
		"192.168.0.0/16", "198.18.0.0/15", "198.51.100.0/24", "203.0.113.0/24",
		"224.0.0.0/4", "240.0.0.0/4", "255.255.255.255/32", "::/128", "::1/128",
		"fc00::/7", "fe80::/10", "ff00::/8", "2001:db8::/32",
	}
	nets := make([]net.IPNet, 0, len(cidrs))
	for _, cidr := range cidrs {
		if _, network, err := net.ParseCIDR(cidr); err == nil {
			nets = append(nets, *network)
		}
	}
	return nets
}()

func isUnsafeWeChatServerIP(ip net.IP) bool {
	if ip == nil || ip.IsUnspecified() || ip.IsLoopback() || ip.IsLinkLocalUnicast() ||
		ip.IsLinkLocalMulticast() || ip.IsInterfaceLocalMulticast() || ip.IsMulticast() || ip.IsPrivate() {
		return true
	}
	if v4 := ip.To4(); v4 != nil {
		ip = v4
	}
	for _, network := range blockedWeChatServerNetworks {
		if network.Contains(ip) {
			return true
		}
	}
	return false
}

func validateWeChatServerAddress(address string) (*url.URL, error) {
	serverURL, err := url.Parse(strings.TrimSpace(address))
	if err != nil {
		return nil, fmt.Errorf("微信服务器地址无效: %w", err)
	}
	scheme := strings.ToLower(serverURL.Scheme)
	if scheme != "http" && scheme != "https" {
		return nil, errors.New("微信服务器地址只允许 http 或 https")
	}
	if serverURL.User != nil {
		return nil, errors.New("微信服务器地址不允许 userinfo")
	}
	host := serverURL.Hostname()
	if host == "" || serverURL.Host == "" {
		return nil, errors.New("微信服务器地址必须包含主机")
	}
	port := serverURL.Port()
	if port == "" {
		if strings.HasSuffix(serverURL.Host, ":") {
			return nil, errors.New("微信服务器地址端口无效")
		}
		port = map[string]string{"http": "80", "https": "443"}[scheme]
	}
	if port != "80" && port != "443" {
		return nil, errors.New("微信服务器地址只允许 80 或 443 端口")
	}
	serverURL.Scheme = scheme
	if ip := net.ParseIP(host); ip != nil {
		if isUnsafeWeChatServerIP(ip) {
			return nil, errors.New("微信服务器地址不允许指向本机、私网或保留地址")
		}
	} else {
		ips, lookupErr := net.LookupIP(host)
		if lookupErr != nil || len(ips) == 0 {
			return nil, fmt.Errorf("微信服务器主机解析失败: %s", host)
		}
		for _, ip := range ips {
			if isUnsafeWeChatServerIP(ip) {
				return nil, errors.New("微信服务器地址解析到本机、私网或保留地址")
			}
		}
	}
	return serverURL, nil
}

func getWeChatIdByCode(code string) (string, error) {
	if code == "" {
		return "", errors.New("无效的参数")
	}
	serverURL, err := validateWeChatServerAddress(common.WeChatServerAddress)
	if err != nil {
		return "", err
	}
	serverURL.Path = strings.TrimRight(serverURL.Path, "/") + "/api/wechat/user"
	serverURL.RawQuery = "code=" + url.QueryEscape(code)
	req, err := http.NewRequest("GET", serverURL.String(), nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", common.WeChatServerToken)
	client := http.Client{
		Timeout: 5 * time.Second,
	}
	httpResponse, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer httpResponse.Body.Close()
	var res wechatLoginResponse
	err = common.DecodeJson(httpResponse.Body, &res)
	if err != nil {
		return "", err
	}
	if !res.Success {
		return "", errors.New(res.Message)
	}
	if res.Data == "" {
		return "", errors.New("验证码错误或已过期")
	}
	return res.Data, nil
}

func WeChatAuth(c *gin.Context) {
	if !common.WeChatAuthEnabled {
		c.JSON(http.StatusOK, gin.H{
			"message": "管理员未开启通过微信登录以及注册",
			"success": false,
		})
		return
	}
	code := c.Query("code")
	wechatId, err := getWeChatIdByCode(code)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"message": err.Error(),
			"success": false,
		})
		return
	}
	user := model.User{
		WeChatId: wechatId,
	}
	if model.IsWeChatIdAlreadyTaken(wechatId) {
		err := user.FillUserByWeChatId()
		if err != nil {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": err.Error(),
			})
			return
		}
		if user.Id == 0 {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "用户已注销",
			})
			return
		}
	} else {
		if common.RegisterEnabled {
			user.Username = "wechat_" + strconv.Itoa(model.GetMaxUserId()+1)
			user.DisplayName = "WeChat User"
			user.Role = common.RoleCommonUser
			user.Status = common.UserStatusEnabled

			if err := user.Insert(0); err != nil {
				c.JSON(http.StatusOK, gin.H{
					"success": false,
					"message": err.Error(),
				})
				return
			}
		} else {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "管理员关闭了新用户注册",
			})
			return
		}
	}

	if user.Status != common.UserStatusEnabled {
		c.JSON(http.StatusOK, gin.H{
			"message": "用户已被封禁",
			"success": false,
		})
		return
	}
	setupLogin(&user, c)
}

type wechatBindRequest struct {
	Code string `json:"code"`
}

func WeChatBind(c *gin.Context) {
	if !common.WeChatAuthEnabled {
		c.JSON(http.StatusOK, gin.H{
			"message": "管理员未开启通过微信登录以及注册",
			"success": false,
		})
		return
	}
	var req wechatBindRequest
	if err := common.DecodeJson(c.Request.Body, &req); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "无效的请求",
		})
		return
	}
	code := req.Code
	wechatId, err := getWeChatIdByCode(code)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"message": err.Error(),
			"success": false,
		})
		return
	}
	if model.IsWeChatIdAlreadyTaken(wechatId) {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "该微信账号已被绑定",
		})
		return
	}
	userId := c.GetInt("id")
	if userId == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "未登录"})
		return
	}
	// 只更新绑定列，避免完整用户快照覆盖并发的封禁、降权或分组变更。
	if err := model.UpdateUserBindColumn(userId, "wechat_id", wechatId); err != nil {
		common.ApiError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
	return
}
