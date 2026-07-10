export const config = {
  runtime: 'edge', // Edge function for speed
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const apiKey = process.env.GROQ_API_KEY || process.env.NVIDIA_API_KEY; // fallback if needed
  if (!apiKey) {
    console.error('[ai-suggest] GROQ_API_KEY env variable is not set');
    return new Response(JSON.stringify({ error: 'AI provider not configured' }), { status: 500 });
  }

  try {
    const { text } = await req.json();

    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing question text' }), { status: 400 });
    }

    const prompt = `
You are an expert academic assistant helping to organize a high school / secondary school question bank.
Analyze the following exam question or study text and extract the most likely metadata.

Text:
"${text.substring(0, 2000)}"

Respond ONLY with a valid JSON object matching this exact schema:
{
  "subject": "String (e.g. Science, Mathematics, English, etc.)",
  "chapter": "String (e.g. Life Processes, Linear Equations, etc.)",
  "topic": "String (a short 2-4 word topic description)",
  "marks": "String (choose strictly from: '1', '2', '3', '4', '5', '6', '10', or 'Unknown')"
}

If you are unsure about a field, return "Unknown". Do not include any other text, markdown formatting, or explanations. Just the JSON object.
`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant', // optimized for ultra-low latency
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2, // low temp for deterministic JSON
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[ai-suggest] Groq API error ${response.status}: ${errText.slice(0, 200)}`);
      throw new Error(`AI request failed: ${response.status}`);
    }

    const data = await response.json();
    const resultText = data.choices?.[0]?.message?.content || '{}';
    
    let parsed;
    try {
      parsed = JSON.parse(resultText);
    } catch (e) {
      console.error('[ai-suggest] Failed to parse AI JSON:', resultText);
      throw new Error('AI returned malformed JSON');
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[ai-suggest] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}
