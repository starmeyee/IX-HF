export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const apiKey = process.env.GROQ_API_KEY || process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    console.error('[ai-search] GROQ_API_KEY env variable is not set');
    return new Response(JSON.stringify({ error: 'AI provider not configured' }), { status: 500 });
  }

  try {
    const { query, syllabusContext } = await req.json();

    if (!query || typeof query !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing search query' }), { status: 400 });
    }

    const prompt = `
You are an intelligent search assistant routing a user to the correct study notes chapter.
The user's query is: "${query}"

Here is the syllabus structure in the format "Section Name > Subject Name > Chapter Name (chapterId)":
${syllabusContext}

Task: Find the single most relevant chapter for the user's query.
Respond ONLY with a valid JSON object matching this exact schema:
{
  "chapterId": "String (the exact chapterId from the list above, e.g. 'science-0-c1')"
}

If no relevant chapter is found, return "Unknown" for the chapterId. Do not include any other text, markdown formatting, or explanations. Just the JSON object.
`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[ai-search] Groq API error ${response.status}: ${errText.slice(0, 200)}`);
      throw new Error(`AI request failed: ${response.status}`);
    }

    const data = await response.json();
    const resultText = data.choices?.[0]?.message?.content || '{}';
    
    let parsed;
    try {
      parsed = JSON.parse(resultText);
    } catch (e) {
      console.error('[ai-search] Failed to parse AI JSON:', resultText);
      throw new Error('AI returned malformed JSON');
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[ai-search] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}
