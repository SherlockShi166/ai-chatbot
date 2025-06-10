import { z } from 'zod';
import { Session } from 'next-auth';
import { DataStreamWriter, streamObject, tool } from 'ai';
import { getDocumentById, saveSuggestions } from '@/lib/db/queries';
import { Suggestion } from '@/lib/db/schema';
import { generateUUID } from '@/lib/utils';
import { myProvider } from '../providers';

interface RequestSuggestionsProps {
  session: Session;
  dataStream: DataStreamWriter;
}

export const requestSuggestions = ({
  session,
  dataStream,
}: RequestSuggestionsProps) =>
  tool({
    description: 'Request suggestions for a document',
    parameters: z.object({
      documentId: z
        .string()
        .describe('The ID of the document to request edits'),
    }),
    execute: async ({ documentId }) => {
      // 📝 【日志】建议请求工具调用开始
      console.log('\n=== 💡 建议请求工具调用开始 ===');
      console.log('📍 调用位置: lib/ai/tools/request-suggestions.ts:execute()');
      console.log('⏰ 调用时间:', new Date().toISOString());
      console.log('👤 用户ID:', session.user?.id);
      console.log('📊 请求参数:', { documentId });

      try {
        console.log('🔍 查询文档...');
        const document = await getDocumentById({ id: documentId });

        if (!document || !document.content) {
          console.error('❌ 文档未找到或内容为空:', { 
            documentId, 
            hasDocument: !!document,
            hasContent: !!document?.content 
          });
          return {
            error: 'Document not found',
          };
        }

        console.log('✅ 文档查询成功:', {
          documentId,
          title: document.title,
          kind: document.kind,
          contentLength: document.content.length,
          createdAt: document.createdAt,
        });

        const suggestions: Array<
          Omit<Suggestion, 'userId' | 'createdAt' | 'documentCreatedAt'>
        > = [];

        console.log('🤖 开始AI建议生成...');
        console.log('📍 AI调用位置: lib/ai/tools/request-suggestions.ts:streamObject()');
        console.log('🎯 AI模型: artifact-model');
        console.log('📝 文档内容长度:', document.content.length);

        const { elementStream } = streamObject({
          model: myProvider.languageModel('artifact-model'),
          system:
            'You are a help writing assistant. Given a piece of writing, please offer suggestions to improve the piece of writing and describe the change. It is very important for the edits to contain full sentences instead of just words. Max 5 suggestions.',
          prompt: document.content,
          output: 'array',
          schema: z.object({
            originalSentence: z.string().describe('The original sentence'),
            suggestedSentence: z.string().describe('The suggested sentence'),
            description: z.string().describe('The description of the suggestion'),
          }),
        });

        console.log('🔄 开始处理AI建议流...');
        let suggestionCount = 0;

        for await (const element of elementStream) {
          suggestionCount++;
          console.log(`📝 处理第${suggestionCount}个建议:`, {
            originalLength: element.originalSentence?.length || 0,
            suggestedLength: element.suggestedSentence?.length || 0,
            descriptionLength: element.description?.length || 0,
          });

          const suggestion = {
            originalText: element.originalSentence,
            suggestedText: element.suggestedSentence,
            description: element.description,
            id: generateUUID(),
            documentId: documentId,
            isResolved: false,
          };

          console.log('📤 发送建议数据流:', {
            suggestionId: suggestion.id,
            originalTextPreview: suggestion.originalText?.substring(0, 50) + '...',
          });

          dataStream.writeData({
            type: 'suggestion',
            content: suggestion,
          });

          suggestions.push(suggestion);
        }

        console.log('✅ AI建议生成完成:', {
          totalSuggestions: suggestions.length,
          documentId,
        });

        if (session.user?.id) {
          const userId = session.user.id;

          console.log('💾 保存建议到数据库...');
          await saveSuggestions({
            suggestions: suggestions.map((suggestion) => ({
              ...suggestion,
              userId,
              createdAt: new Date(),
              documentCreatedAt: document.createdAt,
            })),
          });

          console.log('✅ 建议保存成功:', {
            savedCount: suggestions.length,
            userId,
          });
        } else {
          console.log('⚠️ 跳过保存建议（用户未登录）');
        }

        const result = {
          id: documentId,
          title: document.title,
          kind: document.kind,
          message: 'Suggestions have been added to the document',
        };

        console.log('✅ 建议请求完成:', {
          documentId,
          title: document.title,
          suggestionsCount: suggestions.length,
          message: result.message,
        });
        
        console.log('=== 🏁 建议请求工具调用结束 ===\n');
        
        return result;
      } catch (error) {
        console.error('\n❌ 建议请求工具调用失败:', {
          error: error instanceof Error ? error.message : String(error),
          documentId,
          userId: session.user?.id,
          timestamp: new Date().toISOString(),
        });
        console.error('=== 🚨 建议请求工具调用错误结束 ===\n');
        throw error;
      }
    },
  });
