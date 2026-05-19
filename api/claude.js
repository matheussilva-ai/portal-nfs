export const config = {
  api: { bodyParser: { sizeLimit: '20mb' } },
  maxDuration: 30,
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.GEMINI_API_KEY;

  // Retorna status da chave sem expor o valor
  if (!apiKey) {
    return res.status(200).json({ 
      ok: false, 
      error: 'CHAVE NAO ENCONTRADA — variavel GEMINI_API_KEY esta vazia no Vercel' 
    });
  }

  // Teste simples: chama Gemini só com texto para confirmar que a chave funciona
  if (req.method === 'GET' || (req.body && req.body.ping)) {
    const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;
    const testResp = await fetch(testUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: 'diga apenas: ok' }] }] }),
    });
    const testData = await testResp.json();
    return res.status(200).json({ 
      ok: !testData.error, 
      gemini_response: testData.error || 'chave funcionando',
      key_length: apiKey.length
    });
  }

  try {
    const { docs, prompt } = req.body;
    const geminiParts = [
      ...docs.map(d => ({ inlineData: { mimeType: d.type, data: d.data } })),
      { text: prompt }
    ];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: geminiParts }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 2000 },
      }),
    });
    const data = await response.json();
    if (data.error) return res.status(200).json({ ok: false, error: data.error.message });
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!text) return res.status(200).json({ ok: false, error: 'Resposta vazia do Gemini' });
    return res.status(200).json({ ok: true, text });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
