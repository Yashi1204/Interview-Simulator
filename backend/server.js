const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdfParse = require('pdf-parse').default || require('pdf-parse');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: ['http://localhost:3000', 'https://interview-simulator-ochre.vercel.app'],
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(express.json());

// Multer for file uploads (memory storage)
const upload = multer({ storage: multer.memoryStorage() });

// --- ROUTE 1: Health check ---
app.get('/', (req, res) => {
  res.json({ message: 'Interview Simulator API is running!' });
});
// ADD after the health check route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Frontend and Backend are connected!' });
});

// --- ROUTE 2: Resume parsing ---
app.post('/api/parse-resume', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // Extract text from PDF
    const pdfData = await pdfParse(req.file.buffer);
    const text = pdfData.text.substring(0, 3000);

    // Send to Groq AI for parsing
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: 'You are a resume parser. Return only JSON, no markdown.'
          },
          {
            role: 'user',
            content: `Extract from this resume and return ONLY JSON:
            {
              "name": "candidate name",
              "role": "most recent job title",
              "skills": ["skill1", "skill2"],
              "languages": ["Python" or "Java" or "C++"],
              "experience": ["one line summary of each job"],
              "projects": ["project name: one line description"],
              "education": "degree and institution"
            }
            Resume: ${text}`
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
    console.error('Resume parse error:', err.message);
    res.status(500).json({ error: 'Failed to parse resume' });
  }
});

// --- ROUTE 3: AI Evaluation ---
app.post('/api/evaluate', async (req, res) => {
  try {
    const { question, answer, role, language, resumeContext } = req.body;

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: 'You are an expert HR and Technical Interviewer. Return only JSON.'
          },
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

// --- ROUTE 4: Save Score ---
app.post('/api/save-score', async (req, res) => {
  try {
    const { userId, score } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    // Score is saved via Firebase on frontend, this just logs it
    console.log(`Score saved for user ${userId}: ${score}`);
    res.json({ success: true, message: 'Score recorded' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save score' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});