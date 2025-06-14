import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/app/(auth)/auth';
import { saveDocument } from '@/lib/db/queries';
import { generateUUID } from '@/lib/utils';

// Use Blob instead of File since File is not available in Node.js environment
const FileSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= 5 * 1024 * 1024, {
      message: 'File size should be less than 5MB',
    })
    // Update the file type based on the kind of files you want to accept
    .refine((file) => ['image/jpeg', 'image/png'].includes(file.type), {
      message: 'File type should be JPEG or PNG',
    }),
});

export async function POST(request: Request) {
  // 📝 【日志】文件上传开始
  console.log('\n=== 📁 文件上传API调用开始 ===');
  console.log('📍 调用位置: app/(chat)/api/files/upload/route.ts');
  console.log('⏰ 调用时间:', new Date().toISOString());

  const session = await auth();

  if (!session) {
    console.error('❌ 用户未认证');
    console.log('=== 🚨 文件上传API调用失败结束 ===\n');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('✅ 用户认证成功:', {
    userId: session.user?.id,
    userEmail: session.user?.email,
  });

  if (request.body === null) {
    console.error('❌ 请求体为空');
    console.log('=== 🚨 文件上传API调用失败结束 ===\n');
    return new Response('Request body is empty', { status: 400 });
  }

  try {
    console.log('📦 开始解析表单数据...');
    const formData = await request.formData();
    const file = formData.get('file') as Blob;

    if (!file) {
      console.error('❌ 没有上传文件');
      console.log('=== 🚨 文件上传API调用失败结束 ===\n');
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    console.log('📊 文件信息:', {
      fileSize: file.size,
      fileType: file.type,
      fileSizeKB: Math.round(file.size / 1024),
    });

    console.log('🔍 验证文件格式和大小...');
    const validatedFile = FileSchema.safeParse({ file });

    if (!validatedFile.success) {
      const errorMessage = validatedFile.error.errors
        .map((error) => error.message)
        .join(', ');

      console.error('❌ 文件验证失败:', errorMessage);
      console.log('=== 🚨 文件上传API调用失败结束 ===\n');
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    console.log('✅ 文件验证通过');

    // Get filename from formData since Blob doesn't have name property
    const filename = (formData.get('file') as File).name;
    console.log('📝 文件名:', filename);

    console.log('🔄 开始转换文件为Buffer...');
    const fileBuffer = await file.arrayBuffer();
    console.log('✅ 文件Buffer转换完成，大小:', fileBuffer.byteLength);

    try {
      console.log('☁️ 开始上传到Vercel Blob存储...');
      const data = await put(`attachments/${filename}`, fileBuffer, {
        access: 'public',
      });

      console.log('✅ Blob存储上传成功:', {
        url: data.url,
        pathname: data.pathname,
      });

      // 🆔 生成文档ID并创建document记录
      const documentId = generateUUID();
      console.log('🆔 生成文档ID:', documentId);

      console.log('💾 开始创建document记录...');
      const documentResult = await saveDocument({
        id: documentId,
        title: `上传的图片: ${filename}`,
        content: data.url, // 存储图片URL
        kind: 'image',
        userId: session.user!.id,
      });

      const savedDocument = documentResult[0]; // saveDocument返回数组，取第一个元素

      console.log('✅ Document记录创建成功:', {
        documentId,
        title: savedDocument.title,
        kind: savedDocument.kind,
        userId: savedDocument.userId,
        contentUrl: savedDocument.content,
      });

      const result = {
        ...data,
        documentId, // 返回文档ID给前端
        title: `上传的图片: ${filename}`,
        kind: 'image' as const,
      };

      console.log('🎉 文件上传流程完成:', {
        blobUrl: data.url,
        documentId,
        filename,
      });
      console.log('=== 🏁 文件上传API调用成功结束 ===\n');

      return NextResponse.json(result);
    } catch (error) {
      console.error('❌ Blob上传失败:', error);
      console.log('=== 🚨 文件上传API调用失败结束 ===\n');
      return NextResponse.json(
        {
          error: 'Upload failed',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error('❌ 请求处理失败:', error);
    console.log('=== 🚨 文件上传API调用失败结束 ===\n');
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 },
    );
  }
}
