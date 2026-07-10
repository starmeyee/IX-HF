export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }

  const apiKey = process.env.GROQ_API_KEY || process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    console.error('[ai-search] GROQ_API_KEY env variable is not set');
    return new Response(JSON.stringify({ error: 'AI provider not configured in Vercel environment' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' } 
    });
  }

  try {
    const body = await req.json();
    const { query, syllabusContext } = body;

    if (!query || typeof query !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing or invalid search query' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    if (!syllabusContext || typeof syllabusContext !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing syllabus context' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' } 
      });
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
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[ai-search] Groq API error ${response.status}: ${errText.slice(0, 500)}`);
      return new Response(JSON.stringify({ 
        error: `AI provider returned ${response.status}`,
        details: errText.slice(0, 200)
      }), { 
        status: 502,
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    const data = await response.json();
    let resultText = data.choices?.[0]?.message?.content || '{}';
    
    // Clean up markdown code blocks if the AI decided to wrap the JSON
    resultText = resultText.replace(/^```json\s*/, '').replace(/```$/, '').trim();
    
    let parsed;
    try {
      parsed = JSON.parse(resultText);
    } catch (e) {
      console.error('[ai-search] Failed to parse AI JSON:', resultText);
      return new Response(JSON.stringify({ 
        error: 'AI returned malformed JSON',
        rawOutput: resultText
      }), { 
        status: 502,
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[ai-search] Unexpected Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error', 
      stack: error.stack 
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
}
