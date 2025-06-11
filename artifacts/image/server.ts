import { myProvider } from '@/lib/ai/providers';
import { createDocumentHandler } from '@/lib/artifacts/server';
import { experimental_generateImage } from 'ai';

export const imageDocumentHandler = createDocumentHandler<'image'>({
  kind: 'image',
  onCreateDocument: async ({ title, dataStream }) => {
    let draftContent = '';

    // 📝 【日志】准备调用Logo图像生成模型
    console.log('\n=== 🎨 AI Logo 图像生成调用开始 ===');
    console.log('📍 调用位置: artifacts/image/server.ts:onCreateDocument()');
    console.log('⏰ 调用时间:', new Date().toISOString());
    console.log('🎯 图像模型: small-model');
    console.log('📝 Logo生成提示词:', title);
    console.log('🔢 生成数量: 1');
    console.log('📐 图像尺寸: 1024x1024');

    const { image } = await experimental_generateImage({
      model: myProvider.imageModel('small-model'),
      prompt: title,
      n: 1,
      size: '1024x1024',
    });

    // 📝 【日志】Logo图像生成完成
    console.log('\n=== ✅ Logo图像生成完成 ===');
    console.log('⏰ 完成时间:', new Date().toISOString());
    console.log('📏 图像大小:', {
      base64Length: image.base64.length,
      estimatedSizeKB: Math.round(image.base64.length * 0.75 / 1024),
    });
    console.log('=== 🏁 Logo图像生成流程结束 ===\n');

    draftContent = image.base64;

    dataStream.writeData({
      type: 'image-delta',
      content: image.base64,
    });

    return draftContent;
  },
  onUpdateDocument: async ({ description, dataStream }) => {
    let draftContent = '';

    // 📝 【日志】准备调用Logo图像更新生成
    console.log('\n=== 🎨 AI Logo图像更新生成调用开始 ===');
    console.log('📍 调用位置: artifacts/image/server.ts:onUpdateDocument()');
    console.log('⏰ 调用时间:', new Date().toISOString());
    console.log('🎯 图像模型: small-model');
    console.log('📝 更新描述:', description);
    console.log('🔢 生成数量: 1');
    console.log('📐 图像尺寸: 1024x1024');

    const { image } = await experimental_generateImage({
      model: myProvider.imageModel('small-model'),
      prompt: description,
      n: 1,
      size: '1024x1024',
    });

    // 📝 【日志】Logo图像更新生成完成
    console.log('\n=== ✅ Logo图像更新生成完成 ===');
    console.log('⏰ 完成时间:', new Date().toISOString());
    console.log('📏 图像大小:', {
      base64Length: image.base64.length,
      estimatedSizeKB: Math.round(image.base64.length * 0.75 / 1024),
    });
    console.log('=== 🏁 Logo图像更新生成流程结束 ===\n');

    draftContent = image.base64;

    dataStream.writeData({
      type: 'image-delta',
      content: image.base64,
    });

    return draftContent;
  },
});
