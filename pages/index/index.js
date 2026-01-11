// pages/index/index.js
const { generateGiftRecommendations } = require('../../utils/api.js')
const { getApiConfig } = require('../../utils/storage.js')

Page({
  data: {
    form: {
      gender: '男',
      age: '',
      interests: '',
      minBudget: '',
      maxBudget: ''
    },
    loading: false,
    showResults: false,
    recommendations: []
  },

  selectGender(e) {
    const gender = e.currentTarget.dataset.gender
    this.setData({
      'form.gender': gender
    })
  },

  onAgeChange(e) {
    this.setData({
      'form.age': e.detail
    })
  },

  onInterestsChange(e) {
    this.setData({
      'form.interests': e.detail
    })
  },

  onMinBudgetChange(e) {
    this.setData({
      'form.minBudget': e.detail
    })
  },

  onMaxBudgetChange(e) {
    this.setData({
      'form.maxBudget': e.detail
    })
  },

  handleGenerate() {
    const { form } = this.data

    // 验证表单
    if (!form.age || !form.minBudget || !form.maxBudget) {
      this.showToast('请填写完整信息')
      return
    }

    const age = parseInt(form.age)
    if (isNaN(age) || age < 1 || age > 120) {
      this.showToast('请输入有效的年龄')
      return
    }

    const minBudget = parseInt(form.minBudget)
    const maxBudget = parseInt(form.maxBudget)

    if (isNaN(minBudget) || isNaN(maxBudget)) {
      this.showToast('请输入有效的预算')
      return
    }

    if (minBudget > maxBudget) {
      this.showToast('最低预算不能大于最高预算')
      return
    }

    // 检查API配置
    const config = getApiConfig()
    if (!config.apiKey) {
      this.showToast('请先配置API Key')
      return
    }

    this.setData({ loading: true })

    generateGiftRecommendations({
      gender: form.gender,
      age: age,
      interests: form.interests || undefined,
      budgetRange: `${minBudget}-${maxBudget}`
    }).then(results => {
      this.setData({
        recommendations: results,
        showResults: true,
        loading: false
      })
    }).catch(error => {
      console.error('生成失败:', error)
      this.showToast(error.message || '生成失败，请重试')
      this.setData({ loading: false })
    })
  },

  handleRegenerate() {
    this.handleGenerate()
  },

  handleReset() {
    this.setData({
      showResults: false,
      recommendations: []
    })
  },

  goToSettings() {
    wx.navigateTo({
      url: '/pages/settings/index'
    })
  },

  showToast(message) {
    wx.showToast({
      title: message,
      icon: 'none',
      duration: 2000
    })
  }
})
