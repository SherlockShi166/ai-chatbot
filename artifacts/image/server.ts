import { myProvider } from '@/lib/ai/providers';
import { createDocumentHandler } from '@/lib/artifacts/server';
import { experimental_generateImage } from 'ai';

export const imageDocumentHandler = createDocumentHandler<'image'>({
  kind: 'image',
  onCreateDocument: async ({ title, dataStream }) => {
    let draftContent = '';

    // 📝 【日志】准备调用图像生成模型
    console.log('\n=== 🎨 AI 图像生成调用开始 ===');
    console.log('📍 调用位置: artifacts/image/server.ts:onCreateDocument()');
    console.log('⏰ 调用时间:', new Date().toISOString());
    console.log('🎯 图像模型: small-model (grok-2-image)');
    console.log('📝 生成提示词:', title);
    console.log('🔢 生成数量: 1');

    const { image } = await experimental_generateImage({
      model: myProvider.imageModel('small-model'),
      prompt: title,
      n: 1,
    });

    // 📝 【日志】图像生成完成
    console.log('\n=== ✅ 图像生成完成 ===');
    console.log('⏰ 完成时间:', new Date().toISOString());
    console.log('📏 图像大小:', {
      base64Length: image.base64.length,
      estimatedSizeKB: Math.round(image.base64.length * 0.75 / 1024),
    });
    console.log('=== 🏁 图像生成流程结束 ===\n');

    draftContent = image.base64;

    dataStream.writeData({
      type: 'image-delta',
      content: image.base64,
    });

    return draftContent;
  },
  onUpdateDocument: async ({ description, dataStream }) => {
    let draftContent = '';

    // 📝 【日志】准备调用图像更新生成
    console.log('\n=== 🎨 AI 图像更新生成调用开始 ===');
    console.log('📍 调用位置: artifacts/image/server.ts:onUpdateDocument()');
    console.log('⏰ 调用时间:', new Date().toISOString());
    console.log('🎯 图像模型: small-model (grok-2-image)');
    console.log('📝 更新描述:', description);
    console.log('🔢 生成数量: 1');

    const { image } = await experimental_generateImage({
      model: myProvider.imageModel('small-model'),
      prompt: description,
      n: 1,
    });

    // 📝 【日志】图像更新生成完成
    console.log('\n=== ✅ 图像更新生成完成 ===');
    console.log('⏰ 完成时间:', new Date().toISOString());
    console.log('📏 图像大小:', {
      base64Length: image.base64.length,
      estimatedSizeKB: Math.round(image.base64.length * 0.75 / 1024),
    });
    console.log('=== 🏁 图像更新生成流程结束 ===\n');

    draftContent = image.base64;

    dataStream.writeData({
      type: 'image-delta',
      content: image.base64,
    });

    return draftContent;
  },
});
