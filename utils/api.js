// utils/api.js
const { getApiConfig } = require('./storage.js')

/**
 * 系统提示词
 */
const SYSTEM_PROMPT = `**角色**：你是一个专业的礼物挑选助手,擅长根据用户提供的简单信息,给出符合预算、有创意且适合收礼人的礼物推荐。

**任务**：基于用户输入的 **性别、年龄、兴趣爱好、预算范围**,生成 **3个礼物选项**,确保推荐:
1. **符合预算**(严格在用户设定的价格区间内)。
2. **贴合兴趣**(若用户提供了兴趣关键词,优先匹配)。
3. **多样化**(避免同类重复,如不推荐3个"杯子")。
4. **简洁描述**(每个推荐用 **10字以内** 概括,如"复古蓝牙音箱")。

**输出格式**(严格遵循):
1. [礼物1名称] - [简短特点,如"科技感"]
2. [礼物2名称] - [简短特点,如"手工定制"]
3. [礼物3名称] - [简短特点,如"小众文艺"]

**限制规则**：
- 不推荐具体品牌或商品链接。
- 不涉及医疗、宗教、政治等敏感领域。
- 若用户未提供兴趣,按年龄和性别默认推荐(如年轻人→"创意小物",长辈→"实用礼品")。

**示例输入**：
- 性别:女 | 年龄:25 | 兴趣:阅读、咖啡 | 预算:100-200元

**示例输出**：
1. 定制书名咖啡杯 - 文艺暖心
2. 迷你手冲咖啡套装 - 精致生活
3. 复古皮质书签 - 优雅实用`

/**
 * 配置参数
 */
const API_CONFIG = {
  timeout: 30000, // 30秒超时
  maxRetries: 3,  // 最大重试次数
  retryDelay: 1000 // 重试延迟时间(毫秒)
}

/**
 * 延迟函数
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 带重试机制的API调用
 */
async function callAPIWithRetry(apiCall, maxRetries = API_CONFIG.maxRetries) {
  let lastError
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await apiCall()
      return result
    } catch (error) {
      lastError = error
      console.warn(`API调用失败，第${attempt}次重试:`, error)
      
      // 如果是最后一次尝试，直接抛出错误
      if (attempt === maxRetries) break
      
      // 网络错误或超时错误才重试
      const errorMsg = error.message || error.errMsg || ''
      if (errorMsg.includes('timeout') || 
          errorMsg.includes('网络') || 
          errorMsg.includes('网络异常') ||
          errorMsg.includes('request:fail')) {
        await delay(API_CONFIG.retryDelay * attempt) // 指数退避
      } else {
        // 其他错误不重试
        break
      }
    }
  }
  
  throw lastError || new Error('API调用失败')
}

/**
 * 调用LLM API生成礼物推荐（带重试和超时机制）
 */
async function generateGiftRecommendations(params) {
  const { apiUrl, apiKey, model } = getApiConfig()

  if (!apiKey) {
    throw new Error('请先在设置中配置API Key')
  }

  // 构建用户输入提示
  let userPrompt = `性别:${params.gender} | 年龄:${params.age} | 预算:${params.budgetRange}元`
  if (params.interests) {
    userPrompt += ` | 兴趣:${params.interests}`
  }

  return callAPIWithRetry(() => {
    return new Promise((resolve, reject) => {
      const requestTask = wx.request({
        url: apiUrl,
        method: 'POST',
        timeout: API_CONFIG.timeout,
        header: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        data: {
          model: model,
          messages: [
            {
              role: 'system',
              content: SYSTEM_PROMPT
            },
            {
              role: 'user',
              content: userPrompt
            }
          ],
          stream: false,
          max_tokens: 512,
          enable_thinking: false
        },
        success(res) {
          try {
            const data = res.data

            // 检查API响应状态
            if (res.statusCode !== 200) {
              const errorMsg = data?.error?.message || `API返回错误状态码: ${res.statusCode}`
              reject(new Error(errorMsg))
              return
            }

            if (!data.choices || data.choices.length === 0) {
              reject(new Error('未获取到推荐结果'))
              return
            }

            const content = data.choices[0].message.content
            const recommendations = parseRecommendations(content)
            resolve(recommendations)
          } catch (error) {
            console.error('解析失败:', error)
            reject(new Error('解析推荐结果失败'))
          }
        },
        fail(err) {
          console.error('API调用失败:', err)
          let errorMsg = err.errMsg || '生成推荐失败,请稍后重试'
          
          // 错误信息优化
          if (err.errMsg.includes('timeout')) {
            errorMsg = '请求超时，请检查网络连接后重试'
          } else if (err.errMsg.includes('request:fail')) {
            errorMsg = '网络连接失败，请检查网络设置'
          }
          
          reject(new Error(errorMsg))
        }
      })

      // 设置超时定时器
      const timeoutId = setTimeout(() => {
        requestTask.abort()
        reject(new Error('请求超时，请稍后重试'))
      }, API_CONFIG.timeout)

      // 请求完成后清除定时器
      requestTask.onComplete(() => {
        clearTimeout(timeoutId)
      })
    })
  })
}

/**
 * 解析API返回的推荐内容
 */
function parseRecommendations(content) {
  const recommendations = []
  const lines = content.split('\n').filter(line => line.trim())

  for (const line of lines) {
    // 匹配格式: 1. [礼物名称] - [特点]
    const match = line.match(/^\d+\.\s*(.+?)\s*-\s*(.+)$/)
    if (match) {
      recommendations.push({
        name: match[1].trim(),
        feature: match[2].trim()
      })
    }
  }

  // 如果解析失败,返回默认推荐
  if (recommendations.length === 0) {
    return [
      { name: '精美礼品盒套装', feature: '实用贴心' },
      { name: '创意小摆件', feature: '独特设计' },
      { name: '定制纪念品', feature: '独一无二' }
    ]
  }

  return recommendations
}

module.exports = {
  generateGiftRecommendations
}
