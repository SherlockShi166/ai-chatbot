import { myProvider } from '@/lib/ai/providers';
import { createDocumentHandler } from '@/lib/artifacts/server';

// 定义 API 响应类型
interface OpenAiImageResponse {
  created: number;
  data: Array<{
    revised_prompt?: string;
    b64_json: string;
    url?: string;
  }>;
  usage?: {
    total_tokens: number;
    input_tokens: number;
    output_tokens: number;
    input_tokens_details?: {
      text_tokens: number;
    };
  };
}

// 直接调用API生成图像
async function generateImage({
  prompt,
  size = '1024x1024',
}: {
  prompt: string;
  size?: string;
}) {
  // 验证输入参数
  if (!prompt) {
    throw new Error('Image generation prompt is empty');
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is not configured');
  }

  // 调用API图像生成接口，设置较长的超时时间
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300000); // 5分钟超时

  try {
    const response = await fetch(
      `${process.env.OPENAI_BASE_URL}images/generations`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: myProvider.imageModel('small-model').modelId,
          prompt: prompt,
          n: 1,
          size: size,
        }),
        signal: controller.signal,
      },
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API图像生成错误响应:', errorText);
      throw new Error(
        `API image generation failed: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    const result: OpenAiImageResponse = await response.json();

    // 验证响应数据
    if (
      !result.data ||
      result.data.length === 0 ||
      !result.data[0].b64_json
    ) {
      throw new Error('Invalid image data format returned by API');
    }

    return {
      image: {
        base64: result.data[0].b64_json,
      },
      usage: result.usage,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('generateImage 错误:', error);
    throw error;
  }
}

// 直接调用API编辑图像
async function editImage({
  originalImageBase64,
  prompt,
  size = '1024x1024',
}: {
  originalImageBase64: string;
  prompt: string;
  size?: string;
}) {
  // 验证输入参数
  if (!originalImageBase64) {
    throw new Error('Original image data is empty');
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is not configured');
  }

  // 清理 base64 数据
  const base64Data = originalImageBase64.replace(
    /^data:image\/[a-z]+;base64,/,
    '',
  );

  // 验证 base64 数据
  if (!base64Data) {
    throw new Error('Invalid base64 image data');
  }

  const binaryData = Buffer.from(base64Data, 'base64');

  // 检查图像大小（API 限制为 4MB）
  if (binaryData.length > 4 * 1024 * 1024) {
    throw new Error('Image file too large, exceeds 4MB limit');
  }

  // 创建 FormData
  const formData = new FormData();
  formData.append('model', myProvider.imageModel('small-model').modelId);
  formData.append(
    'image',
    new Blob([binaryData], { type: 'image/png' }),
    'image.png',
  );
  formData.append('prompt', prompt);
  formData.append('quality', 'high');

  // 调用API图像编辑接口，设置较长的超时时间
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300000); // 5分钟超时

  try {
    const response = await fetch(
      `${process.env.OPENAI_BASE_URL}images/edits`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: formData,
        signal: controller.signal,
      },
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API图像编辑错误响应:', errorText);
      throw new Error(
        `API image editing failed: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    const result: OpenAiImageResponse = await response.json();

    // 验证响应数据
    if (
      !result.data ||
      result.data.length === 0 ||
      !result.data[0].b64_json
    ) {
      throw new Error('Invalid image editing data format returned by API');
    }

    return {
      image: {
        base64: result.data[0].b64_json,
      },
      usage: result.usage,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('editImage 错误:', error);
    throw error;
  }
}

export const imageDocumentHandler = createDocumentHandler<'image'>({
  kind: 'image',
  onCreateDocument: async ({ title, dataStream }) => {
    let draftContent = '';

    // 📝 【日志】准备调用图像生成API
    console.log('\n=== 🎨  API 图像生成调用开始 ===');
    console.log('📍 调用位置: artifacts/image/server.ts:onCreateDocument()');
    console.log('⏰ 调用时间:', new Date().toISOString());
    console.log('🎯 使用接口:  /images/generations');
    console.log(`🎯 图像模型: ${myProvider.imageModel('small-model').modelId}`);
    console.log('📝 Logo生成提示词:', title);
    console.log('🔢 生成数量: 1');
    console.log('📐 图像尺寸: 1024x1024');

    try {
      const { image, usage } = await generateImage({
        prompt: title,
        size: '1024x1024',
      });

      // 📝 【日志】图像生成完成
      console.log('\n=== ✅ 图像生成完成 ===');
      console.log('⏰ 完成时间:', new Date().toISOString());
      console.log('📏 图像大小:', {
        base64Length: image.base64.length,
        estimatedSizeKB: Math.round((image.base64.length * 0.75) / 1024),
      });
      console.log('📊 Token使用统计:', usage);
      console.log('=== 🏁 图像生成流程结束 ===\n');

      draftContent = image.base64;

      dataStream.writeData({
        type: 'image-delta',
        content: image.base64,
      });

      return draftContent;
    } catch (error) {
      console.error('❌ 图像生成失败:', error);
      throw error;
    }
  },
  onUpdateDocument: async ({ document, description, dataStream }) => {
    let draftContent = '';

    // 📝 【日志】准备调用图像编辑API
    console.log('\n=== 🖌️  API 图像编辑调用开始 ===');
    console.log('📍 调用位置: artifacts/image/server.ts:onUpdateDocument()');
    console.log('⏰ 调用时间:', new Date().toISOString());
    console.log('🎯 使用接口:  /images/edits');
    console.log(`🎯 图像模型: ${myProvider.imageModel('small-model').modelId}`);
    console.log('📝 编辑描述:', description);
    console.log('📐 图像尺寸: 1024x1024');
    console.log('🖼️ 原始图像存在:', !!document.content);
    console.log('🖼️ 原始图像大小:', document.content?.length || 0);

    try {
      // 检查是否有原始图像数据
      if (!document.content) {
        throw new Error('No original image data available for editing');
      }

      // 使用 /images/edits API
      const { image, usage } = await editImage({
        originalImageBase64: document.content,
        prompt: description,
        size: '1024x1024',
      });

      // 📝 【日志】图像编辑完成
      console.log('\n=== ✅ 图像编辑完成 ===');
      console.log('⏰ 完成时间:', new Date().toISOString());
      console.log('📏 编辑后图像大小:', {
        base64Length: image.base64.length,
        estimatedSizeKB: Math.round((image.base64.length * 0.75) / 1024),
      });
      console.log('📊 Token使用统计:', usage);
      console.log('=== 🏁 图像编辑流程结束 ===\n');

      draftContent = image.base64;

      dataStream.writeData({
        type: 'image-delta',
        content: image.base64,
      });

      return draftContent;
    } catch (error) {
      console.error('❌ 图像编辑失败:', error);

      // 如果编辑失败，回退到生成新图像
      console.log('🔄 回退到图像生成模式...');
      console.log('📝 使用描述重新生成图像:', description);

      try {
        const { image, usage } = await generateImage({
          prompt: description,
          size: '1024x1024',
        });

        console.log('✅ 回退生成完成');
        console.log('📊 回退生成Token使用:', usage);

        draftContent = image.base64;

        dataStream.writeData({
          type: 'image-delta',
          content: image.base64,
        });

        return draftContent;
      } catch (fallbackError) {
        console.error('❌ 回退图像生成也失败:', fallbackError);
        throw fallbackError;
      }
    }
  },
});
