import { NextResponse } from "next/server"
import { OpenAI } from "openai"
import { generateMockPrediction } from "@/lib/deepseek-service"
import type { ThingSpeakData } from "@/lib/thingspeak-service"

// DeepSeek API配置
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "sk-6318208df0354d61ac7f2d703a0b2fe6"
const DEEPSEEK_BASE_URL = "https://api.deepseek.com"

export async function POST(request: Request) {
  try {// Parse the request body and handle potential errors
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
      console.log("DeepSeek API密钥未配置，使用模拟数据")
      const mockPrediction = generateMockPrediction(weatherData)
      return NextResponse.json(mockPrediction)
    }

    // 构建更适合网页展示的prompt
    const prompt = `
    根据以下气象数据预测未来12小时的天气趋势并给出建议：
    温度：${weatherData.temperature}°C
    湿度：${weatherData.humidity}%
    气压：${weatherData.pressure} hPa
    ${weatherData.rainfall ? `降雨量：${weatherData.rainfall} mm` : ""}
    ${weatherData.windSpeed ? `风速：${weatherData.windSpeed} km/h` : ""}
    ${weatherData.uvIndex ? `紫外线指数：${weatherData.uvIndex}` : ""}

    请按以下JSON格式返回结果（不要添加任何其他文本，只返回JSON）：
    {
      "prediction": "简短的总体预测描述（50字以内）",
      "trends": {
        "temperature": "温度趋势描述（30字以内）",
        "humidity": "湿度趋势描述（30字以内）",
        "pressure": "气压趋势描述（30字以内）",
        "general": "综合天气趋势（50字以内）"
      },
      "recommendations": ["建议1（30字以内）", "建议2（30字以内）", "建议3（30字以内）", "建议4（可选，30字以内）"]
    }
    `

    // 调用DeepSeek API
    const client = new OpenAI({
      apiKey: DEEPSEEK_API_KEY,
      baseURL: DEEPSEEK_BASE_URL,
      dangerouslyAllowBrowser: true, // 添加此选项以解决错误
    })

    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: "你是一个专业气象助手，擅长分析气象数据并提供准确的天气预测" },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    })

    const content = response.choices[0].message.content || ""

    // 尝试解析JSON响应
    try {
      // 提取JSON部分（防止AI返回额外文本）
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      const jsonStr = jsonMatch ? jsonMatch[0] : content
      const predictionData = JSON.parse(jsonStr)
      return NextResponse.json(predictionData)
    } catch (parseError) {
      console.error("无法解析AI响应为JSON:", parseError)
      console.log("原始响应:", content)

      // 返回模拟数据作为备选
      return NextResponse.json(generateMockPrediction(weatherData))
    }
  } catch (error) {
    console.error("调用DeepSeek API失败:", error)

    // 如果API调用失败，返回模拟数据
    const weatherData = await request.json()
    return NextResponse.json(generateMockPrediction(weatherData as ThingSpeakData))
  }
}
