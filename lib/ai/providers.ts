import { createOpenAI } from "@ai-sdk/openai";
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";
import { isTestEnvironment } from "../constants";
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from "./models.test";
import { xai } from "@ai-sdk/xai";

// 创建第三方 OpenAI 客户端
const openAI = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
  compatibility: "compatible", // 第三方提供商使用 compatible 模式
});

// 📝 【日志】AI提供商配置
console.log('\n=== ⚙️ AI 提供商配置 ===');
console.log('🌐 API Base URL:', process.env.OPENAI_BASE_URL);
console.log('🔑 API Key 前4位:', process.env.OPENAI_API_KEY?.slice(0, 4) + '****');
console.log('🧪 测试环境:', isTestEnvironment);
console.log('=== ⚙️ 配置加载完成 ===\n');

export const myProvider = isTestEnvironment
  ? customProvider({
      languageModels: {
        "chat-model": chatModel,
        "chat-model-reasoning": reasoningModel,
        "title-model": titleModel,
        "artifact-model": artifactModel,
      },
    })
  // 1、xAI官方API ⇒ 可以生图
  // : customProvider({
  //     languageModels: {
  //       "chat-model": xai("grok-3-mini"),
  //       "chat-model-reasoning": wrapLanguageModel({
  //         model: xai("grok-3-mini"),
  //         middleware: extractReasoningMiddleware({ tagName: "think" }),
  //       }),
  //       "title-model": xai("grok-3-mini"),
  //       "artifact-model": xai("grok-3-mini"),
  //     },
  //     imageModels: {
  //       "small-model": xai.image("grok-2-image"),
  //     },
  //   });

  // 2、openAI兼容写法 + xAI官方API ⇒ 可以生图
  // : customProvider({
  //     languageModels: {
  //       "chat-model": openAI("grok-3-mini"),
  //       "chat-model-reasoning": wrapLanguageModel({
  //         model: openAI("grok-3-mini"),
  //         middleware: extractReasoningMiddleware({ tagName: "think" }),
  //       }),
  //       "title-model": openAI("grok-3-mini"),
  //       "artifact-model": openAI("grok-3-mini"),
  //     },
  //     imageModels: {
  //       "small-model": openAI.image("grok-2-image"),
  //     },
  //   });

  // 3、openAI兼容写法 + 麻雀API ⇒ 完全没回复
  // : customProvider({
  //   languageModels: {
  //     "chat-model": openAI("gpt-4o-mini"),
  //     "chat-model-reasoning": wrapLanguageModel({
  //       model: openAI("o1-mini"),
  //       middleware: extractReasoningMiddleware({ tagName: "think" }),
  //     }),
  //     "title-model": openAI("gpt-4o-mini"),
  //     "artifact-model": openAI("gpt-4o-mini"),
  //   },
  //   imageModels: {
  //     "small-model": openAI.image("gpt-image-1"),
  //   },
  // });

  // 4、openAI兼容写法 + 所罗门API（xAI） ⇒ 文字回复可以，但是没有grok-2-image模型所以没发生成图片
  // : customProvider({
  //   languageModels: {
  //     "chat-model": openAI("grok-3"),
  //     "chat-model-reasoning": wrapLanguageModel({
  //       model: openAI("grok-3-think"),
  //       middleware: extractReasoningMiddleware({ tagName: "think" }),
  //     }),
  //     "title-model": openAI("grok-3"),
  //     "artifact-model": openAI("grok-3"),
  //   },
  //   imageModels: {
  //     "small-model": openAI.image("grok-2-image-1212"),
  //   },
  // });

  // 5、openAI兼容写法 + 所罗门API ⇒ 可以生图
  : customProvider({
      languageModels: {
        "chat-model": openAI("gpt-4o-mini"),
        "chat-model-reasoning": wrapLanguageModel({
          model: openAI("o1-mini"),
          middleware: extractReasoningMiddleware({ tagName: "think" }),
        }),
        "title-model": openAI("gpt-4o-mini"),
        "artifact-model": openAI("gpt-4o-mini"),
      },
      imageModels: {
        "small-model": openAI.image("gpt-image-1-all"),
      },
    });
