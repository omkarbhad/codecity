import { convertToModelMessages, streamText, type UIMessage } from "ai"
import { openrouter } from "@openrouter/ai-sdk-provider"

export const maxDuration = 60

export async function POST(req: Request) {
  const { messages, context }: { messages: UIMessage[]; context?: string } =
    await req.json()

  const systemPrompt = `You are CodeCity AI, an expert code assistant embedded in a 3D code visualization tool. You help developers understand their codebase structure, architecture, dependencies, and code quality.

${context ? `Here is context about the currently viewed project:\n${context}\n` : ""}

Be concise and helpful. When discussing code, reference file paths and function names. Use markdown for code blocks.`

  const result = streamText({
    model: openrouter("anthropic/claude-sonnet-4"),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
  })

  return result.toUIMessageStreamResponse()
}
