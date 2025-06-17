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
    console.log("Weather probability API received data:", {
      temperature: weatherData.temperature,
      humidity: weatherData.humidity,
      rainfall: weatherData.rainfall,
      windSpeed: weatherData.windSpeed,
    })

    // 检查API密钥是否配置
    if (!DEEPSEEK_API_KEY) {
      console.log("DeepSeek API密钥未配置，使用本地逻辑生成天气概率预测")
      const localProbabilities = generateLocalProbabilities(weatherData)
      return NextResponse.json(localProbabilities)
    }

    // 构建更适合网页展示的prompt
    const prompt = `
    根据以下气象数据预测各种天气状况的概率：
    温度：${weatherData.temperature}°C
    湿度：${weatherData.humidity}%
    气压：${weatherData.pressure} hPa
    降雨量：${weatherData.rainfall} mm
    风速：${weatherData.windSpeed} km/h
    紫外线指数：${weatherData.uvIndex}

    请按以下JSON格式返回结果（不要添加任何其他文本，只返回JSON）：
    {
      "probabilities": [
        {"type": "晴天", "probability": 数值（0-100之间的整数）},
        {"type": "多云", "probability": 数值（0-100之间的整数）},
        {"type": "降雨", "probability": 数值（0-100之间的整数）},
        {"type": "大风", "probability": 数值（0-100之间的整数）}
      ],
      "forecastText": "专业的天气预测文本（100字以内）"
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
          { role: "system", content: "你是一个专业的气象学家，根据气象数据提供准确的天气概率预测" },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 500,
        timeout: 10000, // 10 seconds timeout
      })

      const content = response.choices[0].message.content || ""
      console.log("DeepSeek API response for weather probability:", content)

      // 尝试解析JSON响应
      try {
        // 提取JSON部分（防止AI返回额外文本）
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        const jsonStr = jsonMatch ? jsonMatch[0] : content
        const probabilityData = JSON.parse(jsonStr)
        return NextResponse.json(probabilityData)
      } catch (parseError) {
        console.error("无法解析AI响应为JSON:", parseError)
        console.log("原始响应:", content)

        // 返回本地生成的概率预测作为备选
        const localProbabilities = generateLocalProbabilities(weatherData)
        return NextResponse.json(localProbabilities)
      }
    } catch (apiError) {
      console.error("调用DeepSeek API失败:", apiError)

      // 如果API调用失败，返回本地生成的概率预测
      const localProbabilities = generateLocalProbabilities(weatherData)
      return NextResponse.json(localProbabilities)
    }
  } catch (error) {
    console.error("Weather probability API error:", error)

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

// 本地生成天气概率预测的函数
function generateLocalProbabilities(weatherData: ThingSpeakData) {
  const { temperature, humidity, rainfall, windSpeed } = weatherData

  // 这里使用简化的逻辑来计算概率，实际应用中可能需要更复杂的气象模型

  // 晴天概率 - 降雨量低且湿度低时概率高
  const sunnyProb = Math.max(0, Math.min(100, 100 - rainfall * 50 - (humidity - 40)))

  // 多云概率 - 中等湿度且无雨时概率高
  const cloudyProb = Math.max(0, Math.min(100, humidity > 60 ? 60 + (humidity - 60) * 1.5 : 30 + humidity / 2))

  // 降雨概率 - 基于当前降雨量和湿度
  const rainProb = Math.max(
    0,
    Math.min(100, rainfall > 0 ? 50 + rainfall * 20 : humidity > 80 ? (humidity - 80) * 5 : 0),
  )

  // 大风概率 - 基于当前风速
  const windyProb = Math.max(0, Math.min(100, windSpeed > 10 ? (windSpeed - 10) * 5 : 0))

  const probabilities = [
    { type: "晴天", probability: Math.round(sunnyProb) },
    { type: "多云", probability: Math.round(cloudyProb) },
    { type: "降雨", probability: Math.round(rainProb) },
    { type: "大风", probability: Math.round(windyProb) },
  ]

  // 生成专业预测文本
  let forecastText = "专业预测："

  // 主要天气状况
  const highestProb = [...probabilities].sort((a, b) => b.probability - a.probability)[0]
  forecastText += `今日天气以${highestProb.type}为主，`

  // 温度描述
  if (temperature > 30) {
    forecastText += "气温较高，注意防暑，"
  } else if (temperature < 10) {
    forecastText += "气温较低，注意保暖，"
  } else {
    forecastText += "气温适宜，"
  }

  // 降雨描述
  if (rainfall > 0 || probabilities.find((p) => p.type === "降雨")?.probability! > 50) {
    forecastText += "有降雨可能，建议携带雨具。"
  } else {
    forecastText += "降雨概率低。"
  }

  // 风力描述
  if (windSpeed > 20) {
    forecastText += "风力较大，注意防风。"
  } else if (windSpeed > 10) {
    forecastText += "有轻微风力。"
  } else {
    forecastText += "风力较小。"
  }

  return { probabilities, forecastText }
}
