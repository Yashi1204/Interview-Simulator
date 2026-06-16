const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: ['http://localhost:3000', 'https://interview-simulator-ochre.vercel.app'],
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true
}));
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

app.get('/', (req, res) => {
  res.json({ message: 'Interview Simulator API is running!' });
});

app.get('/api/test', (req, res) => {
  res.json({ message: 'Frontend and Backend are connected!' });
});

app.post('/api/parse-resume', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // Extract text using pdfjs-dist
    const uint8Array = new Uint8Array(req.file.buffer);
    const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
    const pdf = await loadingTask.promise;

    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      fullText += content.items.map(item => item.str).join(' ') + ' ';
    }

    const text = fullText.replace(/\s+/g, ' ').trim().substring(0, 3000);

    if (!text || text.length < 20) {
      return res.status(400).json({ error: 'Could not extract readable text from this PDF. Please upload a text-based PDF resume (not a scanned image).' });
    }

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.1-8b-instant',
        temperature: 0,
        messages: [
          {
            role: 'system',
            content: 'You are a resume parser. You will be given raw resume text. Extract ONLY the real information present in that text. Never invent, guess, or use example/placeholder values. Respond with raw JSON only — no markdown, no code fences, no explanation.'
          },
          {
            role: 'user',
            content: `Resume text (this is the ONLY source of truth — extract real values from it, do not invent anything):
"""
${text}
"""

Return a JSON object with exactly these keys, populated only from the resume text above:
{
  "name": string,
  "role": string,
  "skills": string[],
  "languages": string[],
  "experience": string[],
  "projects": string[],
  "education": string
}

If a field genuinely cannot be found in the text, use an empty string or empty array for it — never substitute an example.`
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const content = response.data.choices[0].message.content;
    const cleaned = content.replace(/```json|```/g, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);

    if (!match) {
      console.error('Resume parse error: No JSON object found in Groq response:', content);
      return res.status(502).json({ error: 'Resume parsing failed — could not extract structured data. Please try again.' });
    }

    let parsed;
    try {
      parsed = JSON.parse(match[0]);
    } catch (parseErr) {
      console.error('Resume parse error: Invalid JSON from Groq:', match[0]);
      return res.status(502).json({ error: 'Resume parsing failed — invalid response format. Please try again.' });
    }

    res.json({ success: true, data: parsed });

  } catch (err) {
    console.error('Resume parse error:', err.message);
    res.status(500).json({ error: 'Failed to parse resume' });
  }
});

app.post('/api/evaluate', async (req, res) => {
  try {
    const { question, answer, role, language, resumeContext } = req.body;

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: 'You are an expert HR and Technical Interviewer. Return only JSON.' },
          {
            role: 'user',
            content: `Evaluate this interview answer:
            Question: ${question}
            Answer: ${answer}
            Role: ${role} (${language || 'General'})
            Context: ${resumeContext || ''}
            
            Return JSON: {"scores": {"clarity": 1-10, "relevance": 1-10, "depth": 1-10}, "feedback": "str", "model_answer": "str"}`
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const content = response.data.choices[0].message.content;
    const cleaned = content.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned.match(/\{[\s\S]*\}/)[0]);
    res.json({ success: true, data: parsed });

  } catch (err) {
    console.error('Evaluation error:', err.message);
    res.status(500).json({ error: 'Failed to evaluate answer' });
  }
});

app.post('/api/save-score', async (req, res) => {
  try {
    const { userId, score } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    console.log(`Score saved for user ${userId}: ${score}`);
    res.json({ success: true, message: 'Score recorded' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save score' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});