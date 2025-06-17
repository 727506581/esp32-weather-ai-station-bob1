// server.js
import express from 'express';
import bodyParser from 'body-parser';
import OpenAI from 'openai';
import cors from 'cors';

// 初始化 Express 应用
const app = express();
const PORT = 3002; // 修改为其他未被占用的端口

// 配置中间件
app.use(cors()); // 允许跨域请求（前端可以访问）
app.use(bodyParser.json()); // 解析 JSON 请求体
app.use(cors({ origin: "http://localhost:3000" }));

// 初始化 DeepSeek (兼容 OpenAI SDK)
const openai = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: 'sk-6318208df0354d61ac7f2d703a0b2fe6'  // ← 请在这里填上真实的 API Key
});

// 路由：前端调用此接口传感器数据，然后转发给 DeepSeek
app.post('/api/deepseek', async (req, res) => {
  const { weatherData } = req.body;

  try {
    const completion = await openai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'user',
          content: `根据以下传感器数据预测天气并给出建议：${JSON.stringify(weatherData)}`
        }
      ]
    });

    const result = completion.choices[0].message.content;
    res.json({ result });
  } catch (error) {
    console.error('调用 DeepSeek API 失败：', error);
    res.status(500).send('DeepSeek 请求失败');
  }
});

// 启动服务器
console.log('服务器启动中...');
app.listen(PORT, () => {
  console.log(`✅ 后端已启动：http://localhost:${PORT}`);
});
app.use(cors({ origin: "http://localhost:3000" }));