import { tool } from 'ai';
import { z } from 'zod';

export const getWeather = tool({
  description: 'Get the current weather at a location',
  parameters: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  execute: async ({ latitude, longitude }) => {
    // 📝 【日志】天气工具调用开始
    console.log('\n=== 🌤️ 天气查询工具调用开始 ===');
    console.log('📍 调用位置: lib/ai/tools/get-weather.ts:execute()');
    console.log('⏰ 调用时间:', new Date().toISOString());
    console.log('📊 查询参数:', {
      latitude,
      longitude,
      location: `${latitude}, ${longitude}`,
    });

    try {
      console.log('🌐 发起天气API请求...');
      const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&hourly=temperature_2m&daily=sunrise,sunset&timezone=auto`;
      console.log('🔗 API URL:', apiUrl);

      const response = await fetch(apiUrl);

      console.log('📡 API响应状态:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });

      if (!response.ok) {
        throw new Error(
          `Weather API request failed: ${response.status} ${response.statusText}`,
        );
      }

      const weatherData = await response.json();

      console.log('✅ 天气数据获取成功:', {
        temperature: weatherData.current?.temperature_2m,
        timezone: weatherData.timezone,
        dataKeys: Object.keys(weatherData),
      });

      console.log('=== 🏁 天气查询工具调用结束 ===\n');

      return weatherData;
    } catch (error) {
      console.error('\n❌ 天气查询工具调用失败:', {
        error: error instanceof Error ? error.message : String(error),
        latitude,
        longitude,
        timestamp: new Date().toISOString(),
      });
      console.error('=== 🚨 天气查询工具调用错误结束 ===\n');
      throw error;
    }
  },
});
