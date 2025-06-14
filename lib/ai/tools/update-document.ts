import { DataStreamWriter, tool } from 'ai';
import { Session } from 'next-auth';
import { z } from 'zod';
import { getDocumentById } from '@/lib/db/queries';
import { documentHandlersByArtifactKind } from '@/lib/artifacts/server';
import { generateUUID } from '@/lib/utils';

interface UpdateDocumentProps {
  session: Session;
  dataStream: DataStreamWriter;
}

export const updateDocument = ({ session, dataStream }: UpdateDocumentProps) =>
  tool({
    description: 'Update a document with the given description.',
    parameters: z.object({
      id: z.string().describe('The ID of the document to update'),
      description: z
        .string()
        .describe('The description of changes that need to be made'),
    }),
    execute: async ({ id, description }) => {
      // 📝 【日志】文档更新工具调用开始
      console.log('\n=== ✏️ 文档更新工具调用开始 ===');
      console.log('📍 调用位置: lib/ai/tools/update-document.ts:execute()');
      console.log('⏰ 调用时间:', new Date().toISOString());
      console.log('👤 用户ID:', session.user?.id);
      console.log('📊 更新参数:', {
        documentId: id,
        description,
        descriptionLength: description.length,
      });

      try {
        console.log('🔍 查询文档...');
        const document = await getDocumentById({ id });

        if (!document) {
          console.error('❌ 文档未找到:', { documentId: id });
          console.error(
            '💡 提示: 请确保文档ID正确，或者使用createDocument创建新文档',
          );
          return {
            error: `Document with ID "${id}" not found. Please check the document ID or use createDocument to create a new document.`,
          };
        }

        console.log('✅ 文档查询成功:', {
          documentId: id,
          title: document.title,
          kind: document.kind,
          contentLength: document.content?.length || 0,
          createdAt: document.createdAt,
          userId: document.userId,
        });

        console.log('📤 发送清空数据流...');
        dataStream.writeData({
          type: 'clear',
          content: document.title,
        });

        console.log('🔍 查找文档处理器...');
        const documentHandler = documentHandlersByArtifactKind.find(
          (documentHandlerByArtifactKind) =>
            documentHandlerByArtifactKind.kind === document.kind,
        );

        if (!documentHandler) {
          console.error('❌ 未找到文档处理器:', { kind: document.kind });
          throw new Error(
            `No document handler found for kind: ${document.kind}`,
          );
        }

        console.log('✅ 找到文档处理器:', {
          handlerKind: documentHandler.kind,
          hasOnUpdateDocument:
            typeof documentHandler.onUpdateDocument === 'function',
        });

        // 🆔 生成新的文档ID，让每次更新都创建独立的文档
        const newDocumentId = generateUUID();
        console.log('🆔 生成新文档ID:', newDocumentId);

        console.log('📤 发送新文档ID数据流...');
        dataStream.writeData({
          type: 'id',
          content: newDocumentId,
        });

        console.log('🔧 执行文档更新处理器...');
        await documentHandler.onUpdateDocument({
          document: {
            ...document,
            id: newDocumentId, // 使用新ID
          },
          description,
          dataStream,
          session,
        });

        console.log('📤 发送完成数据流...');
        dataStream.writeData({ type: 'finish', content: '' });

        const result = {
          id: newDocumentId, // 返回新ID
          title: document.title,
          kind: document.kind,
          content: 'The document has been updated successfully.',
        };

        console.log('✅ 文档更新成功:', {
          originalDocumentId: id,
          newDocumentId,
          title: document.title,
          kind: document.kind,
          contentMessage: result.content,
        });

        console.log('=== 🏁 文档更新工具调用结束 ===\n');

        return result;
      } catch (error) {
        console.error('\n❌ 文档更新工具调用失败:', {
          error: error instanceof Error ? error.message : String(error),
          documentId: id,
          description,
          userId: session.user?.id,
          timestamp: new Date().toISOString(),
        });
        console.error('=== 🚨 文档更新工具调用错误结束 ===\n');
        throw error;
      }
    },
  });
