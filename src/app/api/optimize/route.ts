import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json()

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `You are an expert at crafting effective AI prompts. Your task is to analyze the following prompt and enhance it to be more clear, specific, and effective.

Keep the core intent but improve:
- Clarity and specificity
- Structure and organization
- Context and examples where helpful
- Actionable instructions

Original prompt:
${prompt}

Please provide ONLY the improved prompt without any explanation or meta-commentary. Return just the enhanced prompt text.`
        }
      ]
    })

    const optimizedPrompt = message.content[0].type === 'text'
      ? message.content[0].text
      : prompt

    return NextResponse.json({ optimizedPrompt })
  } catch (error) {
    console.error('Error optimizing prompt:', error)
    return NextResponse.json(
      { error: 'Failed to optimize prompt' },
      { status: 500 }
    )
  }
}
