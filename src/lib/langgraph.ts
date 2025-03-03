// AI File

import { ChatAnthropic } from "@langchain/anthropic";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import wxflows from "@wxflows/sdk/langchain";
import {
  END,
  START,
  StateGraph,
  MessagesAnnotation,
  MemorySaver,
} from "@langchain/langgraph";
import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  SystemMessage,
  trimMessages,
} from "@langchain/core/messages";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";

import { SYSTEM_MESSAGE } from "@/constants/systemMessage";

// Trim helper
const trimmer = trimMessages({
  maxTokens: 10,
  strategy: "last",
  tokenCounter: (msgs) => msgs.length,
  includeSystem: true,
  allowPartial: true,
  startOn: "human",
});

// Connect to wxflows -- to usse the tools

const toolClient = new wxflows({
  endpoint: process.env.WXFLOW_ENDPOINT!,
  apikey: process.env.WXFLOW_API_KEY!,
});

// Retrieve the tools from the tool client
const tools = await toolClient.lcTools; // Access to the tools we deployed
const toolNode = new ToolNode(tools);

// initialize model
const initializeModel = () => {
  const model = new ChatAnthropic({
    modelName: "claude-3-5-sonnet-20240620",
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    temperature: 0.7, // Higher temperature means more creative responses
    maxTokens: 4096, // Maximum number of tokens in the response
    maxRetries: 2, // Maximum number of retries for the API call
    streaming: true, // Enable streaming of the response, used with SSE
    clientOptions: {
      defaultHeaders: {
        "anthropic-beta": "prompt-caching-2024-07-31", // Allows caching of prompts
      },
    },
    callbacks: [
      {
        handleLLMStart: async (output) => {
          console.log("LLM Start", output);
        },
        handleLLMEnd: async (output) => {
          console.log("LLM End", output);
          const usage = output.llmOutput?.usage;
          if (usage) {
            console.log("LLM Usage", {
              input_tokens: usage.input_tokens,
              output_tokens: usage.output_tokens,
              total_tokens: usage.total_tokens,
              prompt_tokens: usage.prompt_tokens,
              cache_creaation_input_tokens:
                usage.cache_creation_input_tokens || 0,
              cache_read_input_tokens: usage.cache_read_input_tokens || 0,
            });
          }
        },
      },
    ],
    // Bind tools to the model so it can use them
  }).bindTools(tools);
  return model;
};

// Define the function that determines whether the conversation should continue
function shouldContinue(state: typeof MessagesAnnotation.State) {
  const messages = state.messages;
  const lastMessage = messages[messages.length - 1] as AIMessage;
  // check if the message has tool calls
  if (lastMessage.tool_calls?.length) {
    return "tools"; // return it back to the tools
  }

  if (lastMessage.content && lastMessage._getType() === "tool") {
    return "agent"; // return it back to the agent
  }

  //
  return END;
}

// Create the workflow
const createWorkflow = () => {
  const model = initializeModel();
  // State Graph
  const stateGraph = new StateGraph(MessagesAnnotation)
    .addNode("agent", async (state) => {
      //Create the system message
      const systemContent = SYSTEM_MESSAGE;

      // create the prompt template with system message and messages placeholder
      const promptTemplate = ChatPromptTemplate.fromMessages([
        new SystemMessage(systemContent, {
          cache_control: { type: "ephemeral" }, // cache the prompt so it is not sent to the LLM again and thus saving money !!! (max number in the chain is 4)
        }),
        new MessagesPlaceholder("messages"), // placeholder for the messages
      ]);

      // Trim the conversation hisotry
      const trimmedMessages = await trimmer.invoke(state.messages);

      //Format the prompt with the current message (human message)
      const humanPrompt = await promptTemplate.invoke({
        messages: trimmedMessages,
      });

      //Get response from the model
      const response = await model.invoke(humanPrompt);

      return { messages: [response] };
    })
    .addEdge(START, "agent")
    .addNode("tools", toolNode) // MessagesAnnotation is the input type
    .addEdge("tools", "agent") // agent can use the tools
    .addConditionalEdges("agent", shouldContinue);

  return stateGraph;
};

// Add caching headers to the messages
function addCachingHeaders(messages: BaseMessage[]): BaseMessage[] {
  // Rules of caching headers for tunr by turn conversation
  // 1. Cache the first system message
  // 2. Cache the last message
  // 3. Cache the second to last *human* message

  if (!messages.length) return messages;
  // Create a copy of the original messages to avoid mutating the original messages
  const cachedMessages = [...messages];

  // Helper to add caching headers to the message we select
  const addCache = (message: BaseMessage) => {
    message.content = [
      {
        type: "text",
        text: message.content as string,
        cache_control: { type: "ephemeral" },
      },
    ];
  };

  // 2. Cache the last message
  addCache(cachedMessages.at(-1)!);

  // 3. Cache the second to last *human* message
  let humanCount = 0;
  for (let i = cachedMessages.length - 1; i >= 0; i--) {
    if (cachedMessages[i] instanceof HumanMessage) {
      humanCount++;
      if (humanCount === 2) {
        console.log(
          "langgraph.ts file : Caching the second to last human message"
        );
        addCache(cachedMessages[i]);
        break;
      }
    }
  }

  return cachedMessages;
}

export async function submitQuestion(messages: BaseMessage[], chatId: string) {
  // how to add caching before the submission
  const cachedMessages = addCachingHeaders(messages);

  // Create the workflow
  const workflow = createWorkflow();

  // Create a checkpoint to save the state of the conversation
  const checkpointer = new MemorySaver();
  const app = workflow.compile({ checkpointer: checkpointer });

  console.log("langgraph.ts file : Messages", messages);

  // Run the graph stream
  const stream = await app.streamEvents(
    {
      messages: cachedMessages, // with caching
      // messages: messages, // without caching
    },

    {
      version: "v2",
      configurable: { thread_id: chatId },
      streamMode: "messages",
      runId: chatId,
    }
  );

  return stream;
}
