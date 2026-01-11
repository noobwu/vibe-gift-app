// utils/storage.js

// 存储键名
const STORAGE_KEYS = {
  API_URL: 'api_url',
  API_KEY: 'api_key',
  API_MODEL: 'api_model'
}

// 默认配置
const DEFAULT_CONFIG = {
  apiUrl: 'https://api.siliconflow.cn/v1/chat/completions',
  apiKey: '',
  model: 'Qwen/Qwen3-8B'
}

/**
 * 获取API配置
 */
function getApiConfig() {
  return {
    apiUrl: wx.getStorageSync(STORAGE_KEYS.API_URL) || DEFAULT_CONFIG.apiUrl,
    apiKey: wx.getStorageSync(STORAGE_KEYS.API_KEY) || DEFAULT_CONFIG.apiKey,
    model: wx.getStorageSync(STORAGE_KEYS.API_MODEL) || DEFAULT_CONFIG.model
  }
}

/**
 * 保存API配置
 */
function saveApiConfig(config) {
  if (config.apiUrl !== undefined) {
    wx.setStorageSync(STORAGE_KEYS.API_URL, config.apiUrl)
  }
  if (config.apiKey !== undefined) {
    wx.setStorageSync(STORAGE_KEYS.API_KEY, config.apiKey)
  }
  if (config.model !== undefined) {
    wx.setStorageSync(STORAGE_KEYS.API_MODEL, config.model)
  }
}

module.exports = {
  getApiConfig,
  saveApiConfig
}
