import { generateUUID } from '@/lib/utils';
import { DataStreamWriter, tool } from 'ai';
import { z } from 'zod';
import { Session } from 'next-auth';
import {
  artifactKinds,
  documentHandlersByArtifactKind,
} from '@/lib/artifacts/server';

interface CreateDocumentProps {
  session: Session;
  dataStream: DataStreamWriter;
}

export const createDocument = ({ session, dataStream }: CreateDocumentProps) =>
  tool({
    description:
      'Create a document for writing, coding, or image generation activities. Use kind="image" for image generation requests. This tool will call other functions that will generate the contents based on the title and kind.',
    parameters: z.object({
      title: z.string().describe('Document title or image generation prompt'),
      kind: z
        .enum(artifactKinds)
        .describe(
          'Document type: text, code, image, or sheet. Use "image" for generating images.',
        ),
    }),
    execute: async ({ title, kind }) => {
      // 📝 【日志】文档创建工具调用开始
      console.log('\n=== 📝 文档创建工具调用开始 ===');
      console.log('📍 调用位置: lib/ai/tools/create-document.ts:execute()');
      console.log('⏰ 调用时间:', new Date().toISOString());
      console.log('👤 用户ID:', session.user?.id);
      console.log('📊 创建参数:', {
        title,
        kind,
        titleLength: title.length,
      });

      try {
        const id = generateUUID();
        console.log('🆔 生成文档ID:', id);

        console.log('📤 发送文档类型数据流...');
        dataStream.writeData({
          type: 'kind',
          content: kind,
        });

        console.log('📤 发送文档ID数据流...');
        dataStream.writeData({
          type: 'id',
          content: id,
        });

        console.log('📤 发送文档标题数据流...');
        dataStream.writeData({
          type: 'title',
          content: title,
        });

        console.log('📤 发送清空数据流...');
        dataStream.writeData({
          type: 'clear',
          content: '',
        });

        console.log('🔍 查找文档处理器...');
        const documentHandler = documentHandlersByArtifactKind.find(
          (documentHandlerByArtifactKind) =>
            documentHandlerByArtifactKind.kind === kind,
        );

        if (!documentHandler) {
          console.error('❌ 未找到文档处理器:', { kind });
          throw new Error(`No document handler found for kind: ${kind}`);
        }

        console.log('✅ 找到文档处理器:', {
          handlerKind: documentHandler.kind,
          hasOnCreateDocument:
            typeof documentHandler.onCreateDocument === 'function',
        });

        console.log('🔧 执行文档创建处理器...');
        await documentHandler.onCreateDocument({
          id,
          title,
          dataStream,
          session,
        });

        console.log('📤 发送完成数据流...');
        dataStream.writeData({ type: 'finish', content: '' });

        const result = {
          id,
          title,
          kind,
          content: 'A document was created and is now visible to the user.',
        };

        console.log('✅ 文档创建成功:', {
          documentId: id,
          title,
          kind,
          contentMessage: result.content,
        });

        console.log('=== 🏁 文档创建工具调用结束 ===\n');

        return result;
      } catch (error) {
        console.error('\n❌ 文档创建工具调用失败:', {
          error: error instanceof Error ? error.message : String(error),
          title,
          kind,
          userId: session.user?.id,
          timestamp: new Date().toISOString(),
        });
        console.error('=== 🚨 文档创建工具调用错误结束 ===\n');
        throw error;
      }
    },
  });
