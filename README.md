# My AI Agent

A powerful AI chatbot built with LangGraph that can use various tools to enhance its capabilities. This project demonstrates how to create an intelligent agent that can access external tools and services to provide more comprehensive responses.

## 🚀 Features

- Interactive AI chatbot powered by Anthropic's Claude model
- Tool integration using wxflows from IBM
- Conversation history stored in Convex database
- Authentication with Clerk
- Modern UI built with Next.js, React, and Tailwind CSS
- Tool capabilities:
  - YouTube transcript analysis
  - Wikipedia search
  - Google Books search
  - Web requests via curl

## 📋 Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Anthropic API key
- Clerk account
- Convex account
- wxflows account

## 🔧 Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd my-ai-agent
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Set up environment variables:
   Create a `.env.local` file in the root directory with the following variables:
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   CLERK_SECRET_KEY=your_clerk_secret_key
   CONVEX_DEPLOYMENT=your_convex_deployment
   NEXT_PUBLIC_CONVEX_URL=your_convex_url
   ANTHROPIC_API_KEY=your_anthropic_api_key
   WXFLOW_ENDPOINT=your_wxflow_endpoint
   WXFLOW_API_KEY=your_wxflow_api_key
   ```

4. Deploy wxflows tools:
   ```bash
   npx wxflows deploy
   ```
   After deployment, update the `WXFLOW_ENDPOINT` in your `.env.local` file with the provided URL.

5. Get your wxflows API key:
   ```bash
   npx wxflows whoami --apikey
   ```
   Update the `WXFLOW_API_KEY` in your `.env.local` file with the provided key.

## 🏃‍♂️ Running the Application

1. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

2. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## 🏗️ Project Structure

- `/src/app`: Next.js application routes and pages
- `/src/components`: React components
- `/src/lib`: Core functionality including LangGraph implementation
- `/src/wxflows`: Tool definitions for wxflows
- `/src/constants`: System messages and other constants
- `/convex`: Database schema and queries

## 🔄 How It Works

1. The application uses LangGraph to create a workflow for the AI agent
2. When a user sends a message, it's processed through the LangGraph workflow
3. The agent can decide to use tools from wxflows when needed
4. Responses are streamed back to the user in real-time
5. Conversation history is stored in Convex database

## 🛠️ Key Technologies

- **Next.js**: React framework for the frontend
- **LangChain & LangGraph**: For building the AI agent workflow
- **Anthropic Claude**: Large language model
- **wxflows**: Tool integration platform
- **Convex**: Database for storing conversations
- **Clerk**: Authentication and user management
- **Tailwind CSS & shadcn/ui**: Styling and UI components

## 🐛 Debugging

- Check the browser console for frontend errors
- For wxflows issues, run `npx wxflows logs` to see deployment logs
- For Convex issues, check the Convex dashboard
- For authentication issues, check the Clerk dashboard

## 📚 Resources

- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
- [wxflows Documentation](https://wxflows.ibm.stepzen.com/docs/node-cli)
- [Convex Documentation](https://www.convex.dev)
- [Clerk Documentation](https://clerk.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)

## 📝 Notes

- The caching control in Anthropic, OpenAI, and LangChain is implemented in the `langgraph.ts` file
- The system is designed to maintain conversation context while efficiently managing token usage

## 📄 License

[MIT](LICENSE)





Main course : https://www.youtube.com/watch?v=iYX-3hCVmK8&t=3456s&ab_channel=SonnySangha


Tools used:
- wxflows from ibm : https://wxflows.ibm.stepzen.com/docs/node-cli
- langchain
- langgraph
- anthropic API
- database : convex : https://www.convex.dev


* Important * Read caching control in Anthropic, OpenAI and Langchain. (used in langgraph.ts file)