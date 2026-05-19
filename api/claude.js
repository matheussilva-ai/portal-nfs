export const config = {
  api: { bodyParser: { sizeLimit: '20mb' } },
  maxDuration: 30,
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { docs, prompt } = req.body;
    const apiKey = process.env.OPENROUTER_API_KEY;

    // Monta content no formato OpenAI Vision (compatível com OpenRouter)
    const content = [
      ...docs.map(d => ({
        type: 'image_url',
        image_url: { url: `data:${d.type};base64,${d.data}` }
      })),
      { type: 'text', text: prompt }
    ];

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://portal-nfs.vercel.app',
        'X-Title': 'Portal NFs Genial Care',
      },
      body: JSON.stringify({
        model: 'google/gemma-3-27b-it:free',
        messages: [{ role: 'user', content }],
        max_tokens: 2000,
        temperature: 0.1,
      }),
    });

    const data = await response.json();
    if (data.error) return res.status(200).json({ ok: false, error: data.error.message || JSON.stringify(data.error) });
    const text = data.choices?.[0]?.message?.content || '';
    return res.status(200).json({ ok: true, text });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
