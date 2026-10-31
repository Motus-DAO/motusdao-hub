import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to your environment variables.' },
        { status: 500 }
      )
    }

    const { messages, userRole } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      )
    }

    // Create system prompt based on user role
    const systemPrompt = userRole === 'psm' 
      ? `Eres MotusAI, un asistente especializado en salud mental para profesionales de la salud mental (PSM). 
         Tu función es ayudar a psicólogos, terapeutas y otros profesionales de la salud mental con:
         - Supervisión de casos
         - Técnicas terapéuticas
         - Recursos profesionales
         - Mejores prácticas
         - Ética profesional
         
         Siempre mantén un tono profesional, empático y basado en evidencia.
         Recuerda que NO debes dar diagnósticos específicos ni reemplazar la supervisión profesional.
         Responde en español y mantén las respuestas concisas pero informativas.`
      : `Eres MotusAI, un asistente especializado en salud mental para usuarios que buscan apoyo emocional.
         Tu función es:
         - Proporcionar apoyo emocional empático
         - Ofrecer técnicas de relajación y mindfulness
         - Sugerir recursos de autoayuda
         - Escuchar activamente sin juzgar
         - Fomentar la búsqueda de ayuda profesional cuando sea necesario
         
         IMPORTANTE: NO debes dar diagnósticos médicos ni reemplazar la terapia profesional.
         Si detectas señales de crisis, siempre recomienda buscar ayuda profesional inmediata.
         Mantén un tono cálido, empático y no clínico.
         Responde en español y mantén las respuestas concisas pero útiles.`

    // Prepare messages for OpenAI
    const openaiMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map((msg: { isUser: boolean; content: string }) => ({
        role: (msg.isUser ? 'user' : 'assistant') as 'user' | 'assistant',
        content: msg.content
      }))
    ]

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: openaiMessages,
      max_tokens: 500,
      temperature: 0.7,
      presence_penalty: 0.1,
      frequency_penalty: 0.1,
    })

    const aiResponse = completion.choices[0]?.message?.content

    if (!aiResponse) {
      return NextResponse.json(
        { error: 'No response from AI' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: aiResponse,
      usage: completion.usage
    })

  } catch (error) {
    console.error('OpenAI API Error:', error)
    
    // Handle specific OpenAI errors
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'OpenAI API key not configured' },
          { status: 500 }
        )
      }
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
