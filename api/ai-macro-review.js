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

Analyze this macro-level data and provide a strategic performance report.
Focus on:
1. Long-term trends (e.g., Which subjects are carrying their score? Which are dragging it down?)
2. Identification of persistent weak areas that need fundamental re-learning versus quick revision.
3. A specific, actionable strategic plan for the next 24-48 hours.

Rules:
- Do not repeat the exact numbers back to the student blindly. Interpret them.
- Be highly analytical, professional, and encouraging but firm.
- Provide 3 to 5 comprehensive paragraphs or bullet points.
- MUST return a valid JSON object with exactly one key "report" containing the markdown-formatted report string.
Example: { "report": "### Strategic Analysis\\nYour Physics performance is strong, but...\\n\\n### Action Plan\\n1. Revise..." }
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
    let report = "";
    try {
      const content = data.choices?.[0]?.message?.content || '{}';
      const parsed = JSON.parse(content);
      report = parsed.report || "Great effort over these tests. Keep practicing!";
    } catch (e) {
      console.error('Failed to parse AI review:', e);
      report = "Keep up the great work! Focus on your weak subjects.";
    }

    return new Response(JSON.stringify({ report }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[ai-macro-review] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}
