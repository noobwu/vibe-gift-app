// pages/settings/index.js
const { getApiConfig, saveApiConfig } = require('../../utils/storage.js')

Page({
  data: {
    form: {
      apiUrl: 'https://api.siliconflow.cn/v1/chat/completions',
      apiKey: '',
      model: 'Qwen/Qwen3-8B'
    },
    loading: false
  },

  onLoad() {
    this.loadConfig()
  },

  loadConfig() {
    const config = getApiConfig()
    this.setData({
      form: {
        apiUrl: config.apiUrl,
        apiKey: config.apiKey,
        model: config.model
      }
    })
  },

  onApiUrlChange(e) {
    this.setData({
      'form.apiUrl': e.detail
    })
  },

  onApiKeyChange(e) {
    this.setData({
      'form.apiKey': e.detail
    })
  },

  onModelChange(e) {
    this.setData({
      'form.model': e.detail
    })
  },

  handleSave() {
    const { form } = this.data

    if (!form.apiKey) {
      this.showToast('请输入API Key')
      return
    }

    this.setData({ loading: true })

    try {
      saveApiConfig({
        apiUrl: form.apiUrl,
        apiKey: form.apiKey,
        model: form.model
      })

      setTimeout(() => {
        this.setData({ loading: false })
        this.showToast('配置保存成功')
      }, 500)
    } catch (error) {
      this.setData({ loading: false })
      this.showToast('配置保存失败')
    }
  },

  showToast(message) {
    wx.showToast({
      title: message,
      icon: 'none',
      duration: 2000
    })
  }
})
