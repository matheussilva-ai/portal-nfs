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
    const { parts } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    // Gemini aceita PDF via fileData ou inline_data com mime_type application/pdf
    // Monta parts corretamente
    const geminiParts = parts.map(p => {
      if (p.inline_data) {
        return {
          inlineData: {
            mimeType: p.inline_data.mime_type,
            data: p.inline_data.data,
          }
        };
      }
      return { text: p.text };
    });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: geminiParts }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 2000 },
      }),
    });

    const data = await response.json();

    // Log para debug
    if (data.error) {
      return res.status(200).json({ ok: false, error: data.error.message });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return res.status(200).json({ ok: true, text });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
