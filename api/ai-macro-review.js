export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const apiKey = process.env.GROQ_API_KEY || process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    console.error('[ai-macro-review] GROQ_API_KEY env variable is not set');
    return new Response(JSON.stringify({ error: 'AI provider not configured' }), { status: 500 });
  }

  try {
    const { totalTests, overallAccuracy, subjectAggregates, weakTopics } = await req.json();

    if (totalTests === undefined) {
      return new Response(JSON.stringify({ error: 'Missing history data' }), { status: 400 });
    }

    const prompt = `
You are an expert academic strategist.
The student is viewing their long-term Macro Progress Report.

Data Summary:
- Total Tests Taken: ${totalTests}
- Overall Accuracy: ${overallAccuracy}%
- Subject Performance: ${JSON.stringify(subjectAggregates)}
- Persistent Weak Topics: ${JSON.stringify(weakTopics)}

Analyze this macro-level data and provide a structured strategic performance report.
Focus on:
1. Long-term trends (e.g., Which subjects are carrying their score? Which are dragging it down?)
2. Identification of persistent weak areas that need fundamental re-learning versus quick revision.
3. A specific, actionable strategic plan for the next 24-48 hours.

Rules:
- Do not repeat the exact numbers back to the student blindly. Interpret them.
- Be highly analytical, professional, and encouraging but firm.
- MUST return a valid JSON object matching the exact structure below.

Expected JSON format:
{
  "summary": "A punchy, 1-2 sentence overall analytical summary.",
  "strengths": ["Strength 1 (short)", "Strength 2 (short)"],
  "weaknesses": ["Weakness 1 (short)", "Weakness 2 (short)"],
  "focusDistribution": [
    { "topic": "Subject/Topic Name", "percentage": 70, "reason": "Short reason for focus" },
    { "topic": "Another Topic", "percentage": 30, "reason": "Short reason" }
  ],
  "actionPlan": [
    { "title": "Action title", "description": "Action details", "time": "30 mins" }
  ]
}
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
      console.error(`[ai-macro-review] Groq API error ${response.status}: ${errText.slice(0, 200)}`);
      throw new Error(`AI request failed: ${response.status}`);
    }

    const data = await response.json();
    let reportData = null;
    try {
      const content = data.choices?.[0]?.message?.content || '{}';
      reportData = JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse AI review:', e);
      reportData = { summary: "Keep up the great work! Focus on your weak subjects.", strengths: [], weaknesses: [], focusDistribution: [], actionPlan: [] };
    }

    return new Response(JSON.stringify({ reportData }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[ai-macro-review] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}
