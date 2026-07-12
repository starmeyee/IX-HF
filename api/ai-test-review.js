export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const apiKey = process.env.GROQ_API_KEY || process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    console.error('[ai-test-review] GROQ_API_KEY env variable is not set');
    return new Response(JSON.stringify({ error: 'AI provider not configured' }), { status: 500 });
  }

  try {
    const { score, total, difficultyStats, topicStats } = await req.json();

    if (score === undefined || total === undefined) {
      return new Response(JSON.stringify({ error: 'Missing score or total' }), { status: 400 });
    }

    const prompt = `
You are an expert, analytical academic coach.
The student just completed an Elite Star Batch MCQ test.

Results:
Score: ${score} / ${total}
Difficulty Breakdown: ${JSON.stringify(difficultyStats)}
Topic Breakdown: ${JSON.stringify(topicStats)}

Analyze the data and provide 3 to 6 sharp, analytical bullet points (insights).
Focus on patterns: e.g., strong conceptual understanding, weak advanced concepts, careless mistakes, guessing behavior, or accuracy vs difficulty.
- Do NOT repeat the score.
- Do NOT state obvious facts (e.g., "You got 2 wrong").
- Do NOT generate motivational fluff or generic advice.
- Do NOT invent topics or weaknesses not present in the data.
- MUST return a valid JSON object with exactly one key "insights" mapping to an array of strings.
Example: { "insights": ["You solved every Easy and Medium question correctly but your accuracy dropped on Hard questions, indicating advanced application needs work.", "Careless mistakes detected in Accounting Ratios despite strong overall performance."] }
    `.trim();

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[ai-test-review] Groq API error ${response.status}: ${errText.slice(0, 200)}`);
      throw new Error(`AI request failed: ${response.status}`);
    }

    const data = await response.json();
    let insights = [];
    try {
      const content = data.choices?.[0]?.message?.content || '{}';
      const parsed = JSON.parse(content);
      insights = parsed.insights || ["Great effort! Keep practicing to improve your weak areas."];
    } catch (e) {
      console.error('Failed to parse AI review:', e);
      insights = ["Keep up the great work! Focus on your weak topics."];
    }

    return new Response(JSON.stringify({ insights }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[ai-test-review] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}
