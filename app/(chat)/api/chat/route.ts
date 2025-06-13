import {
  appendClientMessage,
  appendResponseMessages,
  createDataStream,
  smoothStream,
  streamText,
} from 'ai';
import { auth, type UserType } from '@/app/(auth)/auth';
import { type RequestHints, systemPrompt } from '@/lib/ai/prompts';
import {
  createStreamId,
  deleteChatById,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  getStreamIdsByChatId,
  saveChat,
  saveMessages,
  updateDocumentMessageId,
} from '@/lib/db/queries';
import { generateUUID, getTrailingMessageId } from '@/lib/utils';
import { generateTitleFromUserMessage } from '../../actions';
import { createDocument } from '@/lib/ai/tools/create-document';
import { updateDocument } from '@/lib/ai/tools/update-document';
import { isProductionEnvironment } from '@/lib/constants';
import { myProvider } from '@/lib/ai/providers';
import { entitlementsByUserType } from '@/lib/ai/entitlements';
import { type PostRequestBody, postRequestBodySchema } from './schema';
import { geolocation } from '@vercel/functions';
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from 'resumable-stream';
import { after } from 'next/server';
import type { Chat } from '@/lib/db/schema';
import { differenceInSeconds } from 'date-fns';
import { ChatSDKError } from '@/lib/errors';

export const maxDuration = 60;

let globalStreamContext: ResumableStreamContext | null = null;

function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
      });
    } catch (error: any) {
      if (error.message.includes('REDIS_URL')) {
        console.log(
          ' > Resumable streams are disabled due to missing REDIS_URL',
        );
      } else {
        console.error(error);
      }
    }
  }

  return globalStreamContext;
}

export async function POST(request: Request) {
  // 📝 【日志】POST 请求开始
  console.log('\n🚀 === POST /api/chat Logo生成请求开始 ===');
  console.log('⏰ 请求时间:', new Date().toISOString());
  console.log('🌐 请求来源:', request.headers.get('user-agent'));
  console.log('📍 请求URL:', request.url);

  let requestBody: PostRequestBody;

  try {
    console.log('📦 开始解析请求体...');
    const json = await request.json();
    console.log('📋 原始请求数据:', {
      hasId: !!json.id,
      hasMessage: !!json.message,
      messageLength: json.message?.content?.length || 0,
      hasAttachments: !!json.message?.experimental_attachments?.length,
      attachmentsCount: json.message?.experimental_attachments?.length || 0,
      selectedChatModel: json.selectedChatModel,
      selectedVisibilityType: json.selectedVisibilityType,
    });

    requestBody = postRequestBodySchema.parse(json);
    console.log('✅ 请求体验证通过');
  } catch (error) {
    console.error(
      '❌ 请求体解析失败:',
      error instanceof Error ? error.message : String(error),
    );
    return new ChatSDKError('bad_request:api').toResponse();
  }

  try {
    const { id, message, selectedChatModel, selectedVisibilityType } =
      requestBody;

    console.log('📊 Logo生成请求详情:', {
      chatId: id,
      messageId: message.id,
      messageRole: message.role,
      messageLength: message.content.length,
      selectedModel: selectedChatModel,
      visibility: selectedVisibilityType,
    });

    console.log('🔐 开始用户认证...');
    const session = await auth();

    if (!session?.user) {
      console.error('❌ 用户未认证');
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    console.log('✅ 用户认证成功:', {
      userId: session.user.id,
      userEmail: session.user.email,
      userType: session.user.type,
    });

    const userType: UserType = session.user.type;

    console.log('📊 检查用户消息限制...');
    const messageCount = await getMessageCountByUserId({
      id: session.user.id,
      differenceInHours: 24,
    });

    console.log('📈 用户今日消息统计:', {
      messageCount,
      userType,
      maxAllowed: entitlementsByUserType[userType].maxMessagesPerDay,
      isLimitReached:
        messageCount > entitlementsByUserType[userType].maxMessagesPerDay,
    });

    // if (messageCount > entitlementsByUserType[userType].maxMessagesPerDay) {
    //   console.error('❌ 用户消息限制已达上限');
    //   return new ChatSDKError('rate_limit:chat').toResponse();
    // }

    console.log('💬 开始处理聊天记录...');
    const chat = await getChatById({ id });

    if (!chat) {
      console.log('📝 聊天不存在，创建新聊天...');
      const title = await generateTitleFromUserMessage({
        message,
      });

      console.log('🏷️ 生成聊天标题:', title);

      await saveChat({
        id,
        userId: session.user.id,
        title,
        visibility: selectedVisibilityType,
      });

      console.log('✅ 新聊天创建成功:', {
        chatId: id,
        title,
        visibility: selectedVisibilityType,
      });
    } else {
      console.log('✅ 找到现有聊天:', {
        chatId: id,
        title: chat.title,
        userId: chat.userId,
        visibility: chat.visibility,
        createdAt: chat.createdAt,
      });

      if (chat.userId !== session.user.id) {
        console.error('❌ 聊天所有权验证失败:', {
          chatUserId: chat.userId,
          currentUserId: session.user.id,
        });
        return new ChatSDKError('forbidden:chat').toResponse();
      }

      console.log('✅ 聊天所有权验证通过');
    }

    console.log('📚 获取历史消息...');
    const previousMessages = await getMessagesByChatId({ id });

    console.log('📊 历史消息统计:', {
      messageCount: previousMessages.length,
      firstMessage: previousMessages[0]
        ? {
            role: previousMessages[0].role,
            createdAt: previousMessages[0].createdAt,
          }
        : null,
      lastMessage: previousMessages[previousMessages.length - 1]
        ? {
            role: previousMessages[previousMessages.length - 1].role,
            createdAt: previousMessages[previousMessages.length - 1].createdAt,
          }
        : null,
    });

    const messages = appendClientMessage({
      // @ts-expect-error: todo add type conversion from DBMessage[] to UIMessage[]
      messages: previousMessages,
      message,
    });

    console.log('✅ 消息列表构建完成，总计:', messages.length, '条消息');

    const { longitude, latitude, city, country } = geolocation(request);

    const requestHints: RequestHints = {
      longitude,
      latitude,
      city,
      country,
    };

    console.log('🌍 地理位置信息:', requestHints);

    console.log('💾 保存用户消息到数据库...');
    await saveMessages({
      messages: [
        {
          chatId: id,
          id: message.id,
          role: 'user',
          parts: message.parts,
          attachments: message.experimental_attachments ?? [],
          createdAt: new Date(),
        },
      ],
    });

    console.log('✅ 用户消息保存成功:', {
      messageId: message.id,
      partsCount: message.parts.length,
      attachmentsCount: message.experimental_attachments?.length || 0,
    });

    console.log('🆔 生成流式响应ID...');
    const streamId = generateUUID();
    await createStreamId({ streamId, chatId: id });

    console.log('✅ 流式响应ID创建成功:', streamId);
    console.log('准备开始调用 createDataStream');

    const stream = createDataStream({
      execute: (dataStream) => {
        // 📝 【日志】准备调用Logo生成大模型
        console.log('\n=== 🤖 AI Logo生成大模型调用开始 ===');
        console.log('📍 调用位置: app/(chat)/api/chat/route.ts:streamText()');
        console.log('⏰ 调用时间:', new Date().toISOString());
        console.log('👤 用户ID:', session.user?.id);
        console.log('💬 聊天ID:', id);
        console.log('🎯 选择模型:', selectedChatModel);
        console.log('🌍 地理位置:', { longitude, latitude, city, country });
        console.log('📨 消息数量:', messages.length);
        console.log('📨 最后一条消息:', {
          role: messages[messages.length - 1]?.role,
          content:
            messages[messages.length - 1]?.content?.slice(0, 100) + '...',
          attachments:
            messages[messages.length - 1]?.experimental_attachments?.length ||
            0,
        });

        // 📝 【日志】检查系统提示词中的Logo指令
        const systemPromptContent = systemPrompt({
          selectedChatModel,
          requestHints,
        });
        console.log('🎯 系统提示词配置:', {
          hasLogoPrompt: systemPromptContent.includes(
            'ChatLogo Prompt Composer',
          ),
          hasMandatoryRequirement: systemPromptContent.includes(
            'CRITICAL REQUIREMENT',
          ),
          hasCreateDocumentTool: systemPromptContent.includes('createDocument'),
          promptLength: systemPromptContent.length,
          isReasoningModel: selectedChatModel === 'chat-model-reasoning',
        });

        const result = streamText({
          model: myProvider.languageModel(selectedChatModel),
          system: systemPrompt({ selectedChatModel, requestHints }),
          messages,
          maxSteps: 5,
          experimental_activeTools:
            selectedChatModel === 'chat-model-reasoning'
              ? []
              : ['createDocument', 'updateDocument'],
          experimental_transform: smoothStream({ chunking: 'word' }),
          experimental_generateMessageId: generateUUID,
          tools: {
            createDocument: createDocument({ session, dataStream }),
            updateDocument: updateDocument({ session, dataStream }),
          },
          onFinish: async ({ response }) => {
            console.log('🏁 AI响应流程完成');
            console.log('📊 完成统计:', {
              messageCount: response.messages.length,
            });

            // 🔍 【关键调试】分析每条响应消息的parts
            response.messages.forEach((msg: any, index: number) => {
              if (msg.role === 'assistant') {
                console.log(`\n🤖 助手消息 #${index}:`, {
                  messageId: msg.id,
                  partsCount: msg.parts?.length || 0,
                });

                // 分析每个part
                msg.parts?.forEach((part: any, partIndex: number) => {
                  console.log(`  📋 Part #${partIndex}:`, {
                    type: part.type,
                    hasContent: !!part.content,
                    contentPreview:
                      typeof part.content === 'string'
                        ? part.content.slice(0, 50) + '...'
                        : typeof part.content,
                  });

                  // 🚨 【核心调试】检查工具调用相关的parts
                  if (part.type === 'tool-invocation') {
                    console.log(`    🛠️ 工具调用详情:`, {
                      toolName: part.toolInvocation?.toolName,
                      state: part.toolInvocation?.state,
                      toolCallId: part.toolInvocation?.toolCallId,
                      hasArgs: !!part.toolInvocation?.args,
                      hasResult: !!part.toolInvocation?.result,
                    });

                    if (part.toolInvocation?.toolName === 'createDocument') {
                      console.log(`    📝 CreateDocument工具调用:`, {
                        state: part.toolInvocation.state,
                        args: part.toolInvocation.args,
                        result: part.toolInvocation.result,
                      });
                    }
                  }

                  if (part.type === 'text') {
                    console.log(`    💬 文本内容:`, {
                      textLength: part.text?.length || 0,
                      textPreview: part.text?.slice(0, 100) + '...',
                    });

                    // 🚨 检查是否包含createDocument相关文本（说明工具未被调用）
                    if (
                      part.text?.includes('createDocument') ||
                      part.text?.includes('IMMEDIATELY call createDocument')
                    ) {
                      console.log(
                        `    ⚠️ 警告: 发现工具调用提示文本，可能工具未被正确调用!`,
                      );
                      console.log(`    🔍 问题文本:`, part.text);
                    }
                  }
                });
              }
            });

            if (session.user?.id) {
              try {
                const assistantId = getTrailingMessageId({
                  messages: response.messages.filter(
                    (message) => message.role === 'assistant',
                  ),
                });

                if (!assistantId) {
                  throw new Error('No assistant message found!');
                }

                const [, assistantMessage] = appendResponseMessages({
                  messages: [message],
                  responseMessages: response.messages,
                });

                console.log('💾 保存AI响应到数据库:', {
                  messageId: assistantId,
                  contentLength: JSON.stringify(assistantMessage.parts).length,
                  attachmentsCount:
                    assistantMessage.experimental_attachments?.length || 0,
                });

                await saveMessages({
                  messages: [
                    {
                      id: assistantId,
                      chatId: id,
                      role: assistantMessage.role,
                      parts: assistantMessage.parts,
                      attachments:
                        assistantMessage.experimental_attachments ?? [],
                      createdAt: new Date(),
                    },
                  ],
                });

                console.log('✅ AI响应保存成功');

                // 🔄 从 AI 响应中提取文档 ID 并更新 messageId
                console.log('🔍 查找需要更新的文档ID...');
                const documentIds: string[] = [];

                // 遍历 AI 消息的 parts，查找 createDocument/updateDocument 工具调用
                // 这边虽然是遍历出来一个documentIds列表，但是实际一条message只会有一次工具调用
                assistantMessage.parts?.forEach((part: any) => {
                  if (
                    part.type === 'tool-invocation' &&
                    (part.toolInvocation?.toolName === 'createDocument' ||
                      part.toolInvocation?.toolName === 'updateDocument') &&
                    part.toolInvocation?.state === 'result' &&
                    part.toolInvocation?.result?.id
                  ) {
                    documentIds.push(part.toolInvocation.result.id);
                    console.log(
                      '🎯 找到文档ID:',
                      part.toolInvocation.result.id,
                    );
                  }
                });

                if (documentIds.length > 0) {
                  console.log('🔄 更新Document表的messageId...', {
                    documentIds,
                    assistantId,
                  });

                  // 更新每个找到的文档
                  for (const documentId of documentIds) {
                    try {
                      await updateDocumentMessageId({
                        documentId,
                        messageId: assistantId,
                      });
                      console.log('✅ Document messageId 更新完成:', {
                        documentId,
                      });
                    } catch (error) {
                      console.error('❌ Document messageId 更新失败:', {
                        documentId,
                        error,
                      });
                      // 这里不抛出错误，因为文档已经创建成功，只是关联失败
                    }
                  }
                } else {
                  console.log('ℹ️ 未找到需要更新的文档');
                }
              } catch (error) {
                console.error('❌ 保存AI响应失败:', error);
              }
            }
            console.log('=== 🏁 AI Logo生成调用流程结束 ===\n');
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: 'stream-text',
          },
        });

        // 📝 【日志】流式响应配置
        console.log('🔄 Logo生成流式响应配置:', {
          chunking: 'word',
          sendReasoning: true,
          maxSteps: 5,
          activeTools:
            selectedChatModel === 'chat-model-reasoning'
              ? []
              : ['createDocument', 'updateDocument'],
        });

        // 📝 【日志】开始消费流并合并到数据流
        console.log('🔄 开始消费AI流式响应...');
        result.consumeStream();

        console.log('🔄 将AI响应合并到数据流...');
        result.mergeIntoDataStream(dataStream, {
          sendReasoning: true,
        });

        console.log('✅ 流式响应设置完成，等待AI处理...');
      },
      onError: (error: unknown) => {
        console.error('\n❌ AI调用出错:', {
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        });
        return 'Oops, an error occurred!';
      },
    });

    console.log('🔄 配置流式响应上下文...');
    const streamContext = getStreamContext();

    if (streamContext) {
      console.log('✅ 使用可恢复流式响应');
      console.log('🎉 === POST Logo生成请求处理完成，开始流式响应 ===\n');
      return new Response(
        await streamContext.resumableStream(streamId, () => stream),
      );
    } else {
      console.log('⚠️ 使用普通流式响应 (Redis不可用)');
      console.log('🎉 === POST Logo生成请求处理完成，开始流式响应 ===\n');
      return new Response(stream);
    }
  } catch (error) {
    console.error('\n❌ === POST Logo生成请求处理出错 ===');
    console.error('🕰️ 错误时间:', new Date().toISOString());
    console.error('💥 错误详情:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      type: error?.constructor?.name,
    });

    if (error instanceof ChatSDKError) {
      console.error('🚨 返回ChatSDK错误响应:', error.message);
      return error.toResponse();
    }

    console.error('🚨 未处理的错误，返回通用错误响应');
    console.error('=== POST Logo生成请求错误处理结束 ===\n');

    return new Response(
      JSON.stringify({
        error: '服务器内部错误，请稍后重试',
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}

export async function GET(request: Request) {
  const streamContext = getStreamContext();
  const resumeRequestedAt = new Date();

  if (!streamContext) {
    return new Response(null, { status: 204 });
  }

  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get('chatId');

  if (!chatId) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  let chat: Chat;

  try {
    chat = await getChatById({ id: chatId });
  } catch {
    return new ChatSDKError('not_found:chat').toResponse();
  }

  if (!chat) {
    return new ChatSDKError('not_found:chat').toResponse();
  }

  if (chat.visibility === 'private' && chat.userId !== session.user.id) {
    return new ChatSDKError('forbidden:chat').toResponse();
  }

  const streamIds = await getStreamIdsByChatId({ chatId });

  if (!streamIds.length) {
    return new ChatSDKError('not_found:stream').toResponse();
  }

  const recentStreamId = streamIds.at(-1);

  if (!recentStreamId) {
    return new ChatSDKError('not_found:stream').toResponse();
  }

  const emptyDataStream = createDataStream({
    execute: () => {},
  });

  const stream = await streamContext.resumableStream(
    recentStreamId,
    () => emptyDataStream,
  );

  /*
   * For when the generation is streaming during SSR
   * but the resumable stream has concluded at this point.
   */
  if (!stream) {
    const messages = await getMessagesByChatId({ id: chatId });
    const mostRecentMessage = messages.at(-1);

    if (!mostRecentMessage) {
      return new Response(emptyDataStream, { status: 200 });
    }

    if (mostRecentMessage.role !== 'assistant') {
      return new Response(emptyDataStream, { status: 200 });
    }

    const messageCreatedAt = new Date(mostRecentMessage.createdAt);

    if (differenceInSeconds(resumeRequestedAt, messageCreatedAt) > 15) {
      return new Response(emptyDataStream, { status: 200 });
    }

    const restoredStream = createDataStream({
      execute: (buffer) => {
        buffer.writeData({
          type: 'append-message',
          message: JSON.stringify(mostRecentMessage),
        });
      },
    });

    return new Response(restoredStream, { status: 200 });
  }

  return new Response(stream, { status: 200 });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  const chat = await getChatById({ id });

  if (chat.userId !== session.user.id) {
    return new ChatSDKError('forbidden:chat').toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}
