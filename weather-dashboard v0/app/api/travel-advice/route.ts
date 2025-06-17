import { NextResponse } from "next/server"
import { OpenAI } from "openai"
import type { ThingSpeakData } from "@/lib/thingspeak-service"

// DeepSeek API配置
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "sk-6318208df0354d61ac7f2d703a0b2fe6"
const DEEPSEEK_BASE_URL = "https://api.deepseek.com"

export async function POST(request: Request) {
  try {
    // Parse the request body and handle potential errors
    let weatherData: ThingSpeakData
    try {
      weatherData = await request.json()
    } catch (error) {
      console.error("Failed to parse request body:", error)
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    // Log the received data
    console.log("Travel advice API received data:", {
      temperature: weatherData.temperature,
      humidity: weatherData.humidity,
      rainfall: weatherData.rainfall,
      windSpeed: weatherData.windSpeed,
    })

    // 检查API密钥是否配置
    if (!DEEPSEEK_API_KEY) {
      console.log("DeepSeek API密钥未配置，使用本地逻辑生成出行建议")
      const localAdvice = generateLocalAdvice(weatherData)
      return NextResponse.json(localAdvice)
    }

    // 构建更适合网页展示的prompt
    const prompt = `
    根据以下气象数据提供出行建议：
    温度：${weatherData.temperature}°C
    湿度：${weatherData.humidity}%
    气压：${weatherData.pressure} hPa
    降雨量：${weatherData.rainfall} mm
    风速：${weatherData.windSpeed} km/h
    紫外线指数：${weatherData.uvIndex}

    请按以下JSON格式返回结果（不要添加任何其他文本，只返回JSON）：
    {
      "suitable": true或false（今日是否适合外出）,
      "reason": "rain"或"wind"或"temperature"或"good"（不适合外出的主要原因，如果适合则为"good"）,
      "title": "简短的建议标题（15字以内）",
      "description": "详细的出行建议（50字以内）",
      "items": ["具体建议1（20字以内）", "具体建议2（20字以内）", "具体建议3（20字以内）"]
    }
    `

    try {
      // 调用DeepSeek API
      const client = new OpenAI({
        apiKey: DEEPSEEK_API_KEY,
        baseURL: DEEPSEEK_BASE_URL,
        dangerouslyAllowBrowser: true, // 添加此选项以解决错误
      })

      const response = await client.chat.completions.create({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: "你是一个专业的出行顾问，根据天气数据提供准确的出行建议" },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 500,
        timeout: 10000, // 10 seconds timeout
      })

      const content = response.choices[0].message.content || ""
      console.log("DeepSeek API response:", content)

      // 尝试解析JSON响应
      try {
        // 提取JSON部分（防止AI返回额外文本）
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        const jsonStr = jsonMatch ? jsonMatch[0] : content
        const adviceData = JSON.parse(jsonStr)
        return NextResponse.json(adviceData)
      } catch (parseError) {
        console.error("无法解析AI响应为JSON:", parseError)
        console.log("原始响应:", content)

        // 返回本地生成的建议作为备选
        const localAdvice = generateLocalAdvice(weatherData)
        return NextResponse.json(localAdvice)
      }
    } catch (apiError) {
      console.error("调用DeepSeek API失败:", apiError)

      // 如果API调用失败，返回本地生成的建议
      const localAdvice = generateLocalAdvice(weatherData)
      return NextResponse.json(localAdvice)
    }
  } catch (error) {
    console.error("Travel advice API error:", error)

    // Return a proper error response
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

// 本地生成出行建议的函数
function generateLocalAdvice(weatherData: ThingSpeakData) {
  const { temperature, rainfall, windSpeed, uvIndex } = weatherData

  // 判断天气状况
  const isRainy = rainfall > 0.5
  const isWindy = windSpeed > 20
  const isHot = temperature > 30
  const isCold = temperature < 10
  const isHighUV = uvIndex > 5

  // 生成主要建议
  if (isRainy) {
    return {
      suitable: false,
      reason: "rain",
      title: "今日不宜外出",
      description: "有降雨，建议减少不必要的外出。外出时请携带雨具，穿着防水鞋。",
      items: ["建议携带雨具", "穿着防水鞋", "减少户外活动时间"],
    }
  } else if (isWindy) {
    return {
      suitable: false,
      reason: "wind",
      title: "今日不宜外出",
      description: "风力较大，外出时注意防风，避免在树下、广告牌下等危险区域停留。",
      items: ["注意防风", "避免在危险区域停留", "固定易被风吹走的物品"],
    }
  } else if (isHot) {
    return {
      suitable: true,
      reason: "temperature",
      title: "今日需注意防暑",
      description: "气温较高，外出请做好防暑措施，多补充水分，避免长时间在烈日下活动。",
      items: ["多补充水分", "穿着轻薄透气的衣物", "避免长时间在烈日下活动"],
    }
  } else if (isCold) {
    return {
      suitable: true,
      reason: "temperature",
      title: "今日需注意保暖",
      description: "气温较低，外出请穿着保暖衣物，避免受凉感冒。",
      items: ["穿着保暖衣物", "避免长时间在户外停留", "注意保暖防寒"],
    }
  } else {
    return {
      suitable: true,
      reason: "good",
      title: "今日适合外出",
      description: "天气良好，温度适宜，是进行户外活动的好时机。",
      items: ["适合户外活动", "穿着舒适的衣物", "享受良好天气"],
    }
  }
}
