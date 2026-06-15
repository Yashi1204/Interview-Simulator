import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useParams, Navigate } from 'react-router-dom';
import {
  LayoutGrid, BookOpen, Code, UserCheck, BarChart3, Layers, FileText, ChevronRight,
  Settings, Home, Mic, Video, Send, Award, ShieldCheck, MessageSquare, Clock, Target,
  CheckCircle2, Briefcase, TrendingUp, DollarSign, Monitor, Download, BrainCircuit, Terminal, Sparkles,
  X, User, Lock, Eye, EyeOff, Palette
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
export const ThemeContext = React.createContext();


// --- 1. CONFIGURATION ---
const GROQ_API_KEY = process.env.REACT_APP_GROQ_API_KEY;
const saveUserData = async (uid, data) => { 
  try {
    await setDoc(doc(db, "users", uid), data, { merge: true });
  } catch (e) {
    console.error("Save error:", e);
  }
};

const loadUserData = async (uid) => {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? snap.data() : null;
  } catch (e) {
    console.error("Load error:", e);
    return null;
  }
};

const getAIResponse = async (prompt) => {
  try {
    const res = await fetch("https://interview-simulator-uwtl.onrender.com/api/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: prompt,
        answer: prompt,
        role: "General",
        language: "General",
        resumeContext: ""
      })
    });
    const data = await res.json();
    return data.data ? JSON.stringify(data.data) : "Evaluation unavailable.";
  } catch (e) {
    console.error("API error:", e);
    return "Evaluation temporary unavailable.";
  }
};

const parseResume = async (file) => {
  try {
    const formData = new FormData();
    formData.append('resume', file);

    const res = await fetch("https://interview-simulator-uwtl.onrender.com/api/parse-resume", {
      method: "POST",
      body: formData
    });
    const data = await res.json();
    return data.success ? data.data : null;
  } catch (e) {
    console.error("Resume parse error:", e);
    return null;
  }
};

// --- 2. DYNAMIC QUESTION POOL (Preserved SDE + Others) ---
// --- 2. GLOBAL QUESTION POOLS ---

const questionPool = {
  "Software Developer": {
    coding: {
      "Python": [
        { q: "Optimize this Python function.", code: "def find_m(arr):\n  max_val = arr[0]\n  for num in arr:\n    if num > max_val: max_val = num\n  return max_val", placeholder: "e.g. return max(arr)" },
        { q: "Reverse a string in Python without using [::-1].", code: "def rev(s): return s[::-1]", placeholder: "e.g. use reversed() or a loop" },
        { q: "Identify the time complexity of this list search.", code: "def search(arr, x): return arr.index(x)", placeholder: "e.g. O(n)" }
      ],
      "C++": [
        { q: "Find the maximum element in a Vector.", code: "int findMax(vector<int> arr) {\n  int m = arr[0];\n  for(int x : arr) if(x > m) m = x;\n  return m;\n}", placeholder: "e.g. use *max_element()" },
        { q: "Explain the difference between Stack and Heap memory.", code: "int x = 10; // Stack\nint* p = new int(20); // Heap", placeholder: "Describe allocation and deallocation..." },
        { q: "Identify the output of this pointer logic.", code: "int a = 5; int* p = &a; *p = 10; cout << a;", placeholder: "What value is printed?" }
      ],
      "Java": [
        { q: "Find the maximum value in an Integer Array.", code: "public int findMax(int[] arr) {\n  int max = arr[0];\n  for(int i : arr) if(i > max) max = i;\n  return max;\n}", placeholder: "e.g. Arrays.stream(arr).max()" },
        { q: "Explain the purpose of the 'static' keyword.", code: "public static void main(String[] args)", placeholder: "What does static mean for memory?" },
        { q: "How do you handle exceptions in Java?", code: "try { int x = 10/0; } catch(Exception e) { ... }", placeholder: "Explain try-catch-finally flow..." }
      ]
    },
    personalized: {
      "Python": [
        { q: "How have you used Python libraries like NumPy or Pandas in a project?", placeholder: "Describe the data processing task..." },
        { q: "Explain a time you optimized Python code for better performance.", placeholder: "Mention profiling tools or list comprehensions..." },
        { q: "How do you manage dependencies and environments in your Python projects?", placeholder: "Pipenv, Venv, Conda, etc." }
      ],
      "C++": [
        { q: "Tell me about a project where you had to manage memory manually in C++.", placeholder: "Mention smart pointers or RAII..." },
        { q: "How do you ensure code safety and prevent memory leaks in C++?", placeholder: "Valgrind, Address Sanitizer, etc." },
        { q: "Describe a time you used STL containers to solve a complex problem.", placeholder: "Maps, Sets, Vectors usage..." }
      ],
      "Java": [
        { q: "Describe your experience with Java multithreading or concurrency.", placeholder: "Thread pools, synchronized, etc." },
        { q: "How do you utilize Spring Boot or Hibernate in your full-stack projects?", placeholder: "Dependency injection, JPA, etc." },
        { q: "Explain a time you had to debug a memory leak or GC issue in Java.", placeholder: "JProfiler, VisualVM, etc." }
      ]
    }
  },
  "Data Analyst": {
    coding: [
      { q: "Write a SQL query to find the second highest salary.", code: "SELECT * FROM Employees ORDER BY salary DESC", placeholder: "Hint: OFFSET 1 LIMIT 1" },
      { q: "Explain the difference between a Left Join and an Inner Join.", code: null, placeholder: "Describe handling of non-matching rows..." },
      { q: "Identify result of: df['A'].fillna(0)", code: "import pandas as pd\ndf = pd.DataFrame({'A': [1, 2, None]})", placeholder: "What is the output?" }
    ],
    personalized: [
      { q: "Describe a time you used data to drive a business decision.", placeholder: "Impact and tools used..." },
      { q: "How do you ensure data quality before analysis?", placeholder: "Cleaning steps..." },
      { q: "Favorite data viz tool and why?", placeholder: "Tableau, PowerBI, etc." }
    ]
  },
  "Product Manager": {
    coding: [
      { q: "How would you prioritize these three features?", code: "1. Dark Mode\n2. Security Patch\n3. New Payment Method", placeholder: "RICE/MoSCoW framework..." },
      { q: "Identify North Star metric for Spotify.", code: null, placeholder: "Single most important growth metric..." },
      { q: "Metric dropped 20% overnight. Investigation steps?", code: null, placeholder: "Root cause analysis..." }
    ],
    personalized: [
      { q: "Tell me about a time you had to say 'No' to a stakeholder.", placeholder: "Managing expectations..." },
      { q: "How do you decide what to build next?", placeholder: "Strategy and feedback..." },
      { q: "Product you love and one change you'd make.", placeholder: "User pain point focus..." }
    ]
  },
  "Finance Professional": {
    coding: [
      { q: "Walk me through the three main financial statements.", code: null, placeholder: "Income Statement, Balance Sheet, Cash Flow..." },
      { q: "Effect of $10 Depreciation increase on statements?", code: "Tax Rate: 20%", placeholder: "Trace the $10 flow..." },
      { q: "How do you calculate WACC?", code: null, placeholder: "Equity/Debt formula..." }
    ],
    personalized: [
      { q: "Experience with financial modeling in Excel.", placeholder: "Complex functions used..." },
      { q: "Managing tight deadlines at quarter-end.", placeholder: "Time management strategy..." },
      { q: "Identified a financial risk in a project.", placeholder: "Risk mitigation steps..." }
    ]
  }
};

const warmupPool = {
  "Software Developer": {
    "Python": [
      { q: "Which keyword is used to define a function in Python?", options: ['func', 'define', 'def', 'function'], correct: 2 },
      { q: "What is the result of 3 ** 2?", options: ['6', '9', '5', '8'], correct: 1 },
      { q: "How do you start a comment in Python?", options: ['//', '/*', '#', '--'], correct: 2 }
    ],
    "C++": [
      { q: "Which operator is used to insert data into cout?", options: ['>>', '<<', '&&', '||'], correct: 1 },
      { q: "How do you declare an integer variable?", options: ['int x;', 'var x;', 'number x;', 'integer x;'], correct: 0 },
      { q: "Which header file is required for input/output?", options: ['<stdio.h>', '<iostream>', '<conio.h>', '<math.h>'], correct: 1 }
    ],
    "Java": [
      { q: "Which access modifier makes a variable visible only within its class?", options: ['public', 'protected', 'private', 'default'], correct: 2 },
      { q: "What is the entry point method for any Java program?", options: ['start()', 'init()', 'main()', 'run()'], correct: 2 },
      { q: "Which keyword is used to create an instance of a class?", options: ['new', 'create', 'alloc', 'instance'], correct: 0 }
    ]
  },
  "Data Analyst": [
    { q: "What is a 'P-value' used for?", options: ['Data cleaning', 'Hypothesis testing', 'Merging tables', 'Visualization'], correct: 1 },
    { q: "Which of these is a Python data library?", options: ['React', 'Pandas', 'Express', 'Django'], correct: 1 },
    { q: "What does 'Correlation' measure?", options: ['Cause and effect', 'Relationship strength', 'Data volume', 'Missing values'], correct: 1 }
  ],
  "Product Manager": [
    { q: "What does MVP stand for?", options: ['Most Valuable Person', 'Minimum Viable Product', 'Market Value Price', 'Main Video Player'], correct: 1 },
    { q: "Which framework is used for prioritization?", options: ['RICE', 'MERN', 'REST', 'CRUD'], correct: 0 },
    { q: "What is a 'User Story'?", options: ['A legal document', 'A software bug', 'A user-focused requirement', 'A social media post'], correct: 2 }
  ],
  "Finance Professional": [
    { q: "What is the 'Bottom Line'?", options: ['Total Revenue', 'Net Income', 'Gross Margin', 'Total Debt'], correct: 1 },
    { q: "Which is a liquidity ratio?", options: ['P/E Ratio', 'Current Ratio', 'ROI', 'ROE'], correct: 1 },
    { q: "What does 'Liquidity' mean?", options: ['Profitability', 'Ease of converting to cash', 'Market share', 'Risk level'], correct: 1 }
  ]
};

// --- 3. RESTORED: DYNAMIC REPORT CARD (ORIGINAL CONTENTS) ---
const ReportCard = ({ score, feedback }) => {
  const accuracy = Math.round((score / 3) * 100);
  const technicalInsight = feedback.coding || "Performance data pending...";
  const behavioralInsight = feedback.personalized || "No behavioral data recorded.";

  const strengths = [];
  if (score >= 2) strengths.push("Strong Fundamental Knowledge");
  if (technicalInsight.toLowerCase().includes("optimal")) strengths.push("Logic Optimization Proficiency");
  if (behavioralInsight.length > 40) strengths.push("Articulate Communication");
  if (strengths.length === 0) strengths.push("Willingness to Learn");

  const handleDownload = () => {
    const content = `
    <html>
      <head>
        <style>
          body { font-family: Georgia, serif; padding: 40px; color: #1a1a2e; background: #fdfcf8; }
          h1 { color: #1a56a3; text-align: center; font-size: 24px; margin-bottom: 4px; }
          .divider { border: none; border-top: 1px solid #c5a059; margin: 16px 0; }
          .section-title { font-size: 13px; font-weight: bold; color: #333; margin: 20px 0 8px; text-transform: uppercase; letter-spacing: 1px; }
          .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f0f0; font-size: 13px; }
          .row span:last-child { font-weight: bold; }
          .strength { padding: 5px 0; font-size: 13px; border-bottom: 1px solid #f0f0f0; }
          .verdict { font-size: 12px; font-style: italic; color: #555; background: #f8fafc; padding: 12px; border-left: 3px solid #00a4ad; margin-top: 8px; }
          .footer { text-align: center; font-size: 10px; color: #999; margin-top: 30px; }
          .badge { background: #00a4ad; color: white; padding: 4px 12px; border-radius: 4px; font-size: 11px; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>Candidate Readiness Report</h1>
        <hr class="divider"/>

        <div class="section-title">Assessment Results</div>
        <div class="row"><span>Warm-up Accuracy</span><span>${Math.round((score / 3) * 100)}%</span></div>
        <div class="row"><span>Technical Assessment</span><span>${feedback.coding ? "Verified" : "N/A"}</span></div>
        <div class="row"><span>Resume Alignment</span><span>${feedback.personalized ? "Verified" : "N/A"}</span></div>

        <div class="section-title">Key Strengths</div>
        ${strengths.map(s => `<div class="strength">• ${s}</div>`).join('')}

        <div class="section-title">AI Industry Verdict</div>
        <div class="verdict">${(feedback.coding || "Performance data pending...").substring(0, 300)}...</div>

        <div class="footer">
          <span class="badge">AI Interview Simulator</span>
          <p>Assessment generated via live performance data</p>
        </div>
      </body>
    </html>
  `;

    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    win.onload = () => {
      win.print();
      URL.revokeObjectURL(url);
    };
  };

  return (
    <div className="bg-[#fdfcf8] dark:bg-[#1e293b] w-full max-w-lg mx-auto p-10 shadow-2xl relative border-t-[5px] border-[#00a4ad] font-sans">
      <div className="text-center text-[#1a56a3] text-2xl font-bold mb-2">Candidate Readiness Report</div>
      <div className="flex items-center justify-center mb-6">
        <div className="h-[1px] bg-[#c5a059] flex-grow"></div>
        <span className="px-4 text-[#c5a059] text-xl">❧</span>
        <div className="h-[1px] bg-[#c5a059] flex-grow"></div>
      </div>
      <div className="border border-[#e0e0e0] p-6 relative bg-white">
        <h2 className="text-center text-sm font-bold tracking-widest text-[#333] mb-4">VERIFIED ASSESSMENT</h2>
        <div className="flex items-center justify-center mb-4 opacity-60">
          <div className="h-[1px] bg-[#c5a059] flex-grow"></div>
          <span className="px-2 text-[#c5a059] text-xs">❧</span>
          <div className="h-[1px] bg-[#c5a059] flex-grow"></div>
        </div>
        <div className="mb-6">
          <p className="font-bold text-sm text-[#333] mb-3">Assessment Results</p>
          <div className="space-y-2">
            <div className="flex items-center text-sm border-b border-[#f0f0f0] pb-1 w-full">
              <div className="w-2 h-2 rounded-full bg-[#1b9b8e] mr-3"></div>
              <span>Warm-up Accuracy :</span> <span className="ml-auto font-bold">{accuracy}%</span>
            </div>
           <div className="flex items-center text-sm border-b border-[#f0f0f0] pb-1 w-full">
              <div className="w-2 h-2 rounded-full bg-[#1b9b8e] mr-3"></div>
              <span>Technical Assessment :</span> <span className="ml-auto font-bold">{feedback.coding ? "Verified" : "N/A"}</span>
            </div>
            <div className="flex items-center text-sm border-b border-[#f0f0f0] pb-1 w-full">
              <div className="w-2 h-2 rounded-full bg-[#1b9b8e] mr-3"></div>
              <span>Resume Alignment :</span> <span className="ml-auto font-bold">{feedback.personalized ? "Verified" : "N/A"}</span>
            </div>
          </div>
        </div>
        <div className="mb-6">
          <p className="font-bold text-sm text-[#333] mb-3">Key Strengths</p>
          <div className="space-y-2">
            {strengths.map((s, i) => (
              <div key={i} className="flex items-center text-sm border-b border-[#f0f0f0] pb-1">
                <div className="w-2 h-2 rounded-full bg-[#2a6dbd] mr-3"></div>
                <span>{s}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="mb-10">
          <p className="font-bold text-sm text-[#333] mb-3">AI Industry Verdict</p>
          <div className="text-xs leading-relaxed italic text-slate-600 bg-slate-50 p-3 rounded border-l-2 border-[#00a4ad]">
            {technicalInsight.substring(0, 150)}...
          </div>
        </div>
        <button onClick={handleDownload} className="mt-4 w-full bg-[#00a4ad] text-white px-5 py-3 text-sm font-bold shadow-lg hover:bg-[#008a91] transition-all flex items-center justify-center gap-2">
          <Download size={16} /> Save Official Report
        </button>
      </div>
      <div className="absolute bottom-0 left-0 w-full h-[5px] bg-gradient-to-r from-[#00a4ad] via-[#1b9b8e] to-[#1a56a3]"></div>
    </div>
  );
};

// --- 1. INDUSTRY SELECTION GRID ---
const IndustryModules = () => {
  const navigate = useNavigate();
  const modules = [
    { id: 'tech', title: 'Tech & Coding', desc: 'System design, CI/CD, databases', icon: <Monitor size={28} className="text-blue-500" /> },
    { id: 'consulting', title: 'Consulting Cases', desc: 'Frameworks, MECE, strategy', icon: <Briefcase size={28} className="text-amber-600" /> },
    { id: 'finance', title: 'Finance & Analysis', desc: 'Valuation, WACC, statements', icon: <DollarSign size={28} className="text-emerald-500" /> },
    { id: 'marketing', title: 'Sales & Marketing', desc: 'GTM, LTV/CAC, growth funnels', icon: <TrendingUp size={28} className="text-purple-500" /> },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans">
      {/* Page Header */}
      <div className="px-8 py-2.5 bg-[#1e6091] border-b border-[#1a5276] flex items-center gap-3">
  <Link to="/" className="flex items-center gap-1.5 px-3 py-1 bg-white/20 rounded-xl text-[10px] font-black text-white hover:bg-white/30 transition-all normal-case tracking-normal">
    <ChevronRight size={12} className="rotate-180" /> Back
  </Link>
  <div>
    <h1 className="text-base font-black text-white tracking-tight uppercase leading-none">Industry-Specific Modules</h1>
    <p className="text-white/50 mt-0.5 font-bold uppercase text-[10px] tracking-widest">Choose a domain to begin your practice round</p>
  </div>
</div>

      {/* Module Grid */}
      <div className="flex flex-col items-center justify-center px-8 py-6 min-h-[calc(100vh-120px)]">
  <div className="grid grid-cols-2 gap-4 w-full max-w-3xl">
    {modules.map((m) => (
      <div
        key={m.id}
        onClick={() => navigate(`/industry/${m.id}`)}
        className="bg-white p-10 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center cursor-pointer hover:shadow-md hover:border-blue-200 hover:scale-[1.02] transition-all group min-h-[220px] justify-center"
      >
              <div className="p-3 bg-slate-50 rounded-xl mb-4 group-hover:scale-110 transition-transform">
                {m.icon}
              </div>
              <h3 className="text-base font-black text-slate-800 mb-1">{m.title}</h3>
              <p className="text-xs text-slate-400 font-medium">{m.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const IndustryContent = () => {
  const { type } = useParams();
  const [loading, setLoading] = useState(false);
  const [aiFeedback, setAiFeedback] = useState("");
  const [hasStarted, setHasStarted] = useState(false);
  const navigate = useNavigate();

  const contentMap = {
    tech: {
      title: "Tech & Coding",
      desc: "System design and engineering concepts",
      questions: ["Explain Microservices architecture.", "CI/CD Workflows.", "DB Indexing explained.", "Load Balancer logic."],
      icon: <Terminal className="text-emerald-500" size={20} />,
      color: "bg-emerald-50 text-emerald-600"
    },
    consulting: {
      title: "Consulting Cases",
      desc: "Strategy frameworks and case analysis",
      questions: ["Design a Market Entry plan.", "The MECE Principle.", "Profitability frameworks.", "Guesstimating volume."],
      icon: <BrainCircuit className="text-blue-500" size={20} />,
      color: "bg-blue-50 text-blue-600"
    },
    finance: {
      title: "Finance & Analysis",
      desc: "Valuation models and financial statements",
      questions: ["DCF vs LBO valuation.", "Linking the 3 statements.", "Calculating WACC.", "NPV Decision making."],
      icon: <DollarSign className="text-amber-500" size={20} />,
      color: "bg-amber-50 text-amber-600"
    },
    marketing: {
      title: "Sales & Marketing",
      desc: "Growth strategy and funnel optimization",
      questions: ["Designing GTM plans.", "LTV/CAC ratios.", "Funnel optimization.", "Churn reduction logic."],
      icon: <TrendingUp className="text-purple-500" size={20} />,
      color: "bg-purple-50 text-purple-600"
    },
  };

  const active = contentMap[type] || contentMap.tech;

  const askAI = async (q) => {
    setAiFeedback("");
    setLoading(true);
    const res = await getAIResponse(`Professionally explain this concept for an interview: ${q}`);
    setAiFeedback(res);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans">
      {/* Header */}
      <div className="px-8 py-2.5 bg-[#1e6091] border-b border-[#1a5276] flex items-center gap-3">
        <button onClick={() => navigate('/industry')} className="flex items-center gap-1.5 px-3 py-1 bg-white/20 rounded-xl text-[10px] font-black text-white hover:bg-white/30 transition-all">
          <ChevronRight size={12} className="rotate-180" /> Back
        </button>
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-white/20 [&_svg]:text-white">
            {active.icon}
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight uppercase text-white leading-none">{active.title}</h1>
            <p className="text-[10px] text-white/50 font-bold mt-0.5 uppercase tracking-widest">{active.desc}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col items-center px-8 py-8 min-h-[calc(100vh-120px)] justify-center">
        {!hasStarted ? (
          <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-100 w-full max-w-xl text-center">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 ${active.color}`}>
              <Target size={28} />
            </div>
            <h2 className="text-base font-black text-slate-800 mb-1">Ready to analyze {active.title}?</h2>
            <p className="text-slate-400 text-xs mb-6 leading-relaxed">
              Click any topic below to get a detailed AI explanation — perfect for interview prep.
            </p>
            <button
              onClick={() => setHasStarted(true)}
              className="px-8 py-2.5 bg-[#1e6091] text-white rounded-xl font-black shadow-sm hover:bg-[#168aad] transition-all uppercase text-xs tracking-widest"
            >
              Unlock Topics
            </button>
          </div>
        ) : (
          <div className="w-full max-w-2xl animate-in fade-in duration-300">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Select a topic</p>
            <div className="space-y-2.5 mb-6">
              {active.questions.map((q, i) => (
                <div
                  key={i}
                  onClick={() => askAI(q)}
                  className="bg-white px-5 py-4 rounded-xl border border-slate-100 hover:border-[#1e6091] hover:shadow-sm cursor-pointer transition-all flex justify-between items-center group"
                >
                  <div className="flex items-center gap-4">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${active.color}`}>
                      0{i + 1}
                    </span>
                    <h3 className="text-sm font-semibold text-slate-700 group-hover:text-[#1e6091] transition-colors">
                      {q}
                    </h3>
                  </div>
                  <ChevronRight size={14} className="text-slate-300 group-hover:text-[#1e6091] transition-colors shrink-0 ml-4" />
                </div>
              ))}
            </div>

            {loading && (
              <div className="flex items-center gap-2 text-[#1e6091] text-xs font-black uppercase tracking-widest animate-pulse py-2 px-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#1e6091] animate-bounce"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-[#1e6091] animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                <div className="w-1.5 h-1.5 rounded-full bg-[#1e6091] animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                <span className="ml-1">AI Analyzing...</span>
              </div>
            )}

            {aiFeedback && (
              <div className="bg-slate-900 text-slate-300 p-6 rounded-xl border border-slate-700 text-sm leading-relaxed animate-in fade-in">
                <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-700">
                  <Sparkles size={13} className="text-blue-400" />
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">AI Explanation</span>
                </div>
                {aiFeedback}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const ResumePage = ({ onResumeComplete }) => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState("idle");
  const [parsed, setParsed] = useState(null);
  const fileRef = useRef();

  const handleFile = async (f) => {
  if (!f || f.type !== "application/pdf") {
    alert("Please upload a PDF file.");
    return;
  }
  setFile(f);
  setStatus("parsing");

  try {
    const data = await parseResume(f);
    if (data) { 
      setParsed(data); 
      setStatus("done"); 
    } else {
      setStatus("error");
    }
  } catch (err) {
    console.error(err);
    setStatus("error");
  }
};
      
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleConfirm = () => {
    localStorage.setItem("resume_data", JSON.stringify(parsed));
    onResumeComplete(parsed);
    navigate("/");
  };

  const handleSkip = () => {
    localStorage.setItem("resume_data", JSON.stringify(null));
    onResumeComplete(null);
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans">
      {/* Header */}
      <div className="flex justify-end px-8 py-3">
  <button onClick={handleSkip} className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors">
    Skip for now →
  </button>
</div>

      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] px-6 py-10">
        <div className="w-full max-w-xl">

          {/* Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-blue-50 text-[#1e6091] px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-4">
              <FileText size={12} /> Resume Upload
            </div>
            <h1 className="text-2xl font-black text-slate-800 mb-2">Upload Your Resume</h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              We'll analyze your resume to personalize your interview questions and match your experience level.
            </p>
          </div>

          {/* Upload area */}
          {(status === "idle" || status === "error") && (
            <>
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current.click()}
                className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${isDragging ? "border-[#1e6091] bg-blue-50" : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50"
                  }`}
              >
                <input ref={fileRef} type="file" accept=".pdf" className="hidden"
                  onChange={(e) => handleFile(e.target.files[0])} />
                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                  <FileText size={24} className="text-slate-400" />
                </div>
                <p className="text-sm font-black text-slate-700 mb-1">
                  {isDragging ? "Drop it here!" : "Drag & drop your resume"}
                </p>
                <p className="text-xs text-slate-400 mb-4">or click to browse files</p>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                  PDF only • Max 5MB
                </span>
                {status === "error" && (
                  <p className="mt-4 text-xs text-red-500 font-bold">Failed to parse. Please try again.</p>
                )}
              </div>

              {/* What this enables */}
              <div className="mt-5 grid grid-cols-3 gap-3">
                {[
                  { icon: <Code size={14} />, text: "Auto-selects your coding language" },
                  { icon: <UserCheck size={14} />, text: "Questions based on your projects" },
                  { icon: <BarChart3 size={14} />, text: "Resume vs performance score" },
                ].map((item, i) => (
                  <div key={i} className="bg-white border border-slate-100 rounded-xl p-3 text-center shadow-sm">
                    <div className="text-[#1e6091] flex justify-center mb-2">{item.icon}</div>
                    <p className="text-[10px] font-bold text-slate-500 leading-tight">{item.text}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Parsing state */}
          {status === "parsing" && (
            <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center shadow-sm">
              <div className="flex items-center justify-center gap-1.5 mb-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-[#1e6091] animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
              <p className="text-sm font-black text-slate-700 mb-1">Analyzing your resume...</p>
              <p className="text-xs text-slate-400">Extracting skills, experience & projects</p>
            </div>
          )}

          {/* Done — parsed result */}
          {status === "done" && parsed && (
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="bg-emerald-500 px-5 py-3 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-white" />
                <span className="text-white text-xs font-black uppercase tracking-widest">Resume Analyzed Successfully</span>
              </div>

              <div className="p-6 space-y-4">
                {/* Name & Role */}
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Candidate</p>
                  <p className="text-base font-black text-slate-800">{parsed?.name || "—"}</p>
                  <p className="text-xs text-slate-500 font-medium">{parsed?.role || "—"}</p>
                </div>

                <div className="h-px bg-slate-50" />

                {/* Skills */}
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Detected Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(parsed?.skills || []).slice(0, 10).map((s, i) => (
                      <span key={i} className="text-[10px] font-black px-2.5 py-1 bg-blue-50 text-[#1e6091] rounded-lg border border-blue-100">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="h-px bg-slate-50" />

                {/* Languages */}
                {parsed?.languages?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Primary Languages</p>
                    <div className="flex gap-2">
                      {parsed.languages.map((l, i) => (
                        <span key={i} className="text-[10px] font-black px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100">
                          {l}
                        </span>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1.5 font-medium">
                      ✓ Coding round will auto-select your primary language
                    </p>
                  </div>
                )}

                <div className="h-px bg-slate-50" />

                {/* Projects */}
                {parsed?.projects?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Projects Found</p>
                    <div className="space-y-1">
                      {parsed.projects.slice(0, 3).map((p, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                          <div className="w-1 h-1 rounded-full bg-[#1e6091] mt-1.5 shrink-0" />
                          {p}
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1.5 font-medium">
                      ✓ Personalized round will reference these projects
                    </p>
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div className="px-6 pb-6 flex gap-3">
                <button onClick={handleConfirm}
                  className="flex-1 py-3 bg-[#1e6091] text-white rounded-xl font-black text-xs tracking-widest uppercase shadow-md hover:bg-[#168aad] transition-all">
                  Continue to Dashboard →
                </button>
                <button onClick={() => { setStatus("idle"); setFile(null); setParsed(null); }}
                  className="px-4 py-3 bg-slate-50 text-slate-500 rounded-xl font-black text-xs border border-slate-200 hover:bg-slate-100 transition-all uppercase tracking-widest">
                  Re-upload
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

// --- 4. DASHBOARD ---
const Dashboard = ({ totalScore }) => {
  const sections = [
    { id: 'warmup', title: 'Round 1: Warm-Up', desc: 'Basics & General Knowledge', icon: <BookOpen size={24} className="text-blue-500" /> },
    { id: 'coding', title: 'Coding Challenge', desc: 'Technical & Logic Round', icon: <Code size={24} className="text-red-500" /> },
    { id: 'personalized', title: 'Resume-Based', desc: 'Personalized Questions', icon: <UserCheck size={24} className="text-emerald-500" /> },
    { id: 'performance', title: 'Performance', desc: 'Overall Scores & Stats', icon: <BarChart3 size={24} className="text-purple-500" /> },
    { id: 'industry', title: 'Industry Specific', desc: 'Sales, Finance, Tech', icon: <Layers size={24} className="text-orange-500" /> },
    { id: 'readiness', title: 'Readiness Report', desc: 'Final Assessment Results', icon: <FileText size={24} className="text-cyan-500" /> },
  ];
  return (
    <div className="min-h-screen bg-[#f0f4f8] font-sans text-slate-800">
      <div className="bg-white min-h-[calc(100vh-64px)] border-t border-slate-200">
        <div className="p-10">
          <header className="mb-10 flex justify-between items-end border-b border-slate-50 pb-6">
            <div><h1 className="text-4xl font-black text-slate-800 tracking-tight">Adaptive Interview Experience</h1><p className="text-slate-500 mt-2 font-medium">Welcome back, <span className="text-emerald-500 font-bold">
              {(() => {
                try {
                  const resume = JSON.parse(localStorage.getItem('resume_data'));
                  const auth = JSON.parse(localStorage.getItem('auth_user'));
                  return resume?.name || auth?.name || 'there';
                } catch { return 'there'; }
              })()}!
            </span></p></div>
            <div className="bg-emerald-50 border border-emerald-200 px-5 py-2 rounded-2xl flex items-center gap-3 shadow-sm"><Award className="text-emerald-600" size={24} /><div><p className="text-[10px] uppercase font-bold text-emerald-600 leading-none">Global Score</p><p className="text-xl font-black text-emerald-800">{totalScore}/3</p></div></div>
          </header>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sections.map((item) => (
              <Link to={`/${item.id}`} key={item.id} className="h-full group">
                <div className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-xl hover:border-blue-200 transition-all h-full relative overflow-hidden">
                  <div className="mb-4 p-3 bg-slate-50 inline-block rounded-xl group-hover:scale-110 transition-transform">{item.icon}</div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">{item.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed mb-6">{item.desc}</p>
                  <div className="flex items-center text-[#1e6091] font-bold text-xs uppercase tracking-widest">Explore Round <ChevronRight size={14} className="ml-1" /></div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
const AIModuleRoom = ({ type, setAiFeedback, selectedRole, resumeData }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(120); // 2 Minutes
  const [hasStarted, setHasStarted] = useState(false);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [selectedLang, setSelectedLang] = useState(() => {
    if (resumeData?.languages?.length > 0) {
      const detected = resumeData.languages.find(l => ["Python", "C++", "Java"].includes(l));
      return detected || null;
    }
    return null;
  });

  // --- CRASH-PROOF DATA LOGIC ---
  const roleData = questionPool[selectedRole] || {};
  const isDeveloper = selectedRole === "Software Developer";

  let currentQuestions = [];
  if (isDeveloper) {
    const specificPool = roleData[type] || {};
    currentQuestions = selectedLang ? (specificPool[selectedLang] || []) : [];
  } else {
    currentQuestions = roleData[type] || [];
  }

  const currentQ = currentQuestions.length > 0 ? currentQuestions[step] : null;

  useEffect(() => {
    if (hasStarted && timer > 0 && !evaluation && !loading) {
      const countdown = setInterval(() => setTimer((prev) => prev - 1), 1000);
      return () => clearInterval(countdown);
    } else if (timer === 0 && !evaluation && hasStarted) {
      setIsTimeUp(true);
    }
  }, [hasStarted, timer, evaluation, loading]);

 const handleVoiceInput = () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    alert("Voice input is not supported in this browser. Please use Chrome or Edge.");
    return;
  }

  if (isListening) {
    setIsListening(false);
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onstart = () => {
    setIsListening(true);
  };

  recognition.onend = () => {
    setIsListening(false);
  };

  recognition.onerror = (e) => {
    setIsListening(false);
    if (e.error === 'not-allowed') {
      alert("Microphone access denied. Please allow mic permission in your browser settings.");
    } else if (e.error === 'no-speech') {
      alert("No speech detected. Please try again.");
    }
  };

  recognition.onresult = (e) => {
    let finalTranscript = '';
    let interimTranscript = '';
    
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) {
        finalTranscript += e.results[i][0].transcript;
      } else {
        interimTranscript += e.results[i][0].transcript;
      }
    }
    
    if (finalTranscript) {
      setInput(prev => prev + ' ' + finalTranscript);
    }
  };

  recognition.start();
};

  const handleEvaluate = async () => {
    if (!input.trim() && !isTimeUp) return;
    setLoading(true); setEvaluation(null);
    const resumeContext = resumeData
      ? `Candidate background: ${resumeData.role || ''}, Skills: ${(resumeData.skills || []).join(', ')}, Projects: ${(resumeData.projects || []).slice(0, 2).join('; ')}.`
      : '';
    const prompt = `Evaluate: ${currentQ?.q}. Answer: ${input}. Context: ${selectedRole} (${selectedLang || 'General'}). ${resumeContext} Return JSON: {"scores": {"clarity": 1-10, "relevance": 1-10, "depth": 1-10}, "feedback": "str", "model_answer": "str"}`;
    const result = await getAIResponse(prompt);
    try {
      setEvaluation(JSON.parse(result.match(/\{[\s\S]*\}/)[0]));
    } catch (e) {
      setEvaluation({ feedback: result, scores: { clarity: 7, relevance: 7, depth: 7 }, model_answer: "Manual review." });
    }
    setLoading(false);
  };

  const handlePrevious = () => {
    if (step > 0) {
      setStep(step - 1);
      setEvaluation(null);
      setInput("");
    }
  };

  const handleNextNav = () => {
    if (step < currentQuestions.length - 1) {
      setStep(step + 1);
      setEvaluation(null);
      setInput("");
    }
  };

  const handleFinish = () => {
    if (evaluation) setAiFeedback(prev => ({ ...prev, [type]: evaluation.feedback }));
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#f0f4f8] font-sans">
      <div className="w-full bg-white min-h-screen">

        {/* Dynamic Header */}
        <div className={`px-8 py-2 mt-0 text-white flex justify-between items-center font-black uppercase tracking-widest ${type === 'coding' ? 'bg-[#1e6091]' : 'bg-emerald-500'}`}>

          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 rounded-xl text-[10px] font-black text-white hover:bg-white/30 transition-all">
              <ChevronRight size={8} className="rotate-180" /> Back
            </Link>
           <span className="text-xs font-extrabold tracking-widest">{type} Round • {selectedRole} {selectedLang ? `(${selectedLang})` : ""}</span>
          </div>
          <div className={`px-6 py-2 rounded-full flex items-center gap-3 border shadow-inner ${isTimeUp ? 'bg-red-500/20 text-red-100' : 'bg-black/20 border-white/10'}`}>
            <Clock size={18} />
            <span className="font-mono text-sm">{Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}</span>
          </div>
        </div>

        <div className="p-12 max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
          {/* STEP 1: Choice */}
          {isDeveloper && !selectedLang ? (
            <div className="text-center py-10 animate-in zoom-in">
              <h2 className="text-3xl font-black text-slate-800 mb-10 uppercase tracking-tighter">Choose Your Stack</h2>
              <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
                {["Python", "C++", "Java"].map(lang => (
                  <button key={lang} onClick={() => setSelectedLang(lang)} className="py-5 bg-blue-50 text-[#1e6091] font-black rounded-3xl border-2 border-blue-100 hover:bg-[#1e6091] hover:text-white transition-all uppercase text-xs">{lang}</button>
                ))}
              </div>
            </div>
          ) : !hasStarted ? (
            /* STEP 2: Start Overlay */
            <div className="text-center py-16 animate-in fade-in">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner ${type === 'coding' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}><Target size={48} /></div>
              <h2 className="text-3xl font-black text-slate-800 mb-4 uppercase tracking-widest">Initialize Round</h2>
              <p className="text-slate-400 mb-10 font-medium">Reveal your {selectedLang} challenge and start the 2-minute timer.</p>
              <button onClick={() => setHasStarted(true)} className={`px-16 py-5 text-white rounded-[30px] font-black shadow-2xl active:scale-95 uppercase text-xs tracking-widest ${type === 'coding' ? 'bg-[#1e6091]' : 'bg-emerald-500'}`}>START TIMER</button>
            </div>
          ) : currentQ ? (
            /* STEP 3: Active Challenge UI */
            <div className="animate-in slide-in-from-bottom-4 duration-700">
              <div className="mb-8 border-l-4 border-blue-500 pl-6 flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Question {step + 1} of 3</p>
                  <h3 className="text-2xl font-bold text-slate-800 italic leading-snug">"{currentQ.q}"</h3>
                </div>

                {/* Text-Based Navigation Buttons */}
                <div className="flex gap-3 mb-1">
                  <button
                    onClick={handlePrevious}
                    disabled={step === 0}
                    className="px-5 py-2 rounded-2xl bg-slate-50 text-[10px] font-black tracking-widest uppercase text-slate-400 hover:bg-slate-100 hover:text-[#1e6091] disabled:opacity-20 transition-all border border-slate-100"
                  >
                    PREVIOUS
                  </button>
                  <button
                    onClick={handleNextNav}
                    disabled={step === currentQuestions.length - 1}
                    className="px-5 py-2 rounded-2xl bg-slate-50 text-[10px] font-black tracking-widest uppercase text-slate-400 hover:bg-slate-100 hover:text-[#1e6091] disabled:opacity-20 transition-all border border-slate-100"
                  >
                    NEXT
                  </button>
                </div>
              </div>

              {currentQ.code && <div className="bg-slate-900 p-8 rounded-[35px] font-mono text-sm text-emerald-400 mb-8 whitespace-pre border-2 border-slate-800 shadow-2xl">{currentQ.code}</div>}

              <div className="relative mb-8">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={isTimeUp}
                  placeholder={isTimeUp ? "Time Expired!" : currentQ.placeholder}
                  className={`w-full h-48 p-8 rounded-[40px] border-2 outline-none bg-slate-50 transition-all font-bold text-slate-700 shadow-inner leading-relaxed ${isTimeUp ? 'border-red-200 bg-red-50' : 'border-slate-100 focus:border-blue-500'}`}
                />
                {!isTimeUp && (
                  <button 
  onClick={handleVoiceInput} 
  className={`absolute right-6 bottom-6 p-4 rounded-full shadow-xl border transition-all ${
    isListening 
      ? 'bg-red-500 text-white border-red-400 animate-pulse' 
      : 'bg-white text-slate-400 border-slate-100 hover:text-blue-500'
  }`}
>
  <Mic size={24} />
</button>
                )}
              </div>

              {isTimeUp && !evaluation && (
                <div className="mb-8 p-6 bg-red-50 border-2 border-red-100 rounded-[30px] flex items-center gap-4 text-red-600 font-black text-xs uppercase animate-pulse">
                  <Clock size={20} /> Time Expired! Submit for partial analysis.
                </div>
              )}

              {evaluation && (
                <div className="space-y-6 mb-10 animate-in slide-in-from-bottom-6">
                  <div className="grid grid-cols-3 gap-4">
                    {Object.entries(evaluation.scores).map(([k, v]) => (
                      <div key={k} className="bg-blue-50 border-2 border-blue-100 p-5 rounded-[30px] text-center shadow-sm">
                        <p className="text-[10px] font-black text-blue-400 uppercase mb-1">{k}</p>
                        <p className="text-2xl font-black text-blue-700">{v}/10</p>
                      </div>
                    ))}
                  </div>
                  <div className="p-8 bg-slate-900 text-slate-200 rounded-[45px] text-xs italic border-l-8 border-blue-500 shadow-2xl">
                    <Sparkles size={18} className="inline mr-2 text-blue-400" /> {evaluation.feedback}
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                {!evaluation ? (
                  <button
                    onClick={handleEvaluate}
                    disabled={loading || (!input.trim() && !isTimeUp)}
                    className={`flex-1 py-6 text-white rounded-[30px] font-black shadow-2xl transition-all uppercase text-xs tracking-widest ${isTimeUp ? 'bg-red-500' : 'bg-[#1e6091]'}`}
                  >
                    {loading ? "Processing..." : isTimeUp ? "SUBMIT PARTIAL ANSWER" : "ANALYZE ANSWER"}
                  </button>
                ) : (
                  <button
                    onClick={step === currentQuestions.length - 1 ? handleFinish : handleNextNav}
                    className="flex-1 py-6 bg-slate-100 text-slate-600 rounded-[30px] font-black shadow-xl hover:bg-slate-200 text-xs tracking-widest uppercase"
                  >
                    {step === currentQuestions.length - 1 ? "FINISH ROUND" : "NEXT QUESTION →"}
                  </button>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

// --- RESTORED: WARMUP ROUND ---
const WarmUpRound = ({ setGlobalScore, selectedRole }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [localScore, setLocalScore] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [selectedLang, setSelectedLang] = useState(() => {
    try {
      const resume = JSON.parse(localStorage.getItem('resume_data'));
      if (resume?.languages?.length > 0) {
        const detected = resume.languages.find(l => ["Python", "C++", "Java"].includes(l));
        return detected || null;
      }
    } catch { }
    return null;
  });

  const rolePool = warmupPool[selectedRole] || warmupPool["Software Developer"];
  const isDeveloper = selectedRole === "Software Developer";
  const questions = isDeveloper && selectedLang ? rolePool[selectedLang] : (!isDeveloper ? rolePool : []);

  const handleAns = (i) => {
    setSelectedAnswers(prev => ({ ...prev, [step]: i }));
  };

  const handlePrev = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleNext = () => {
    if (step < questions.length - 1) {
      setStep(step + 1);
    } else {
      let finalScore = 0;
      questions.forEach((q, index) => {
        if (selectedAnswers[index] === q.correct) finalScore++;
      });
      setLocalScore(finalScore);
      setGlobalScore(finalScore);
      setShowSummary(true);
    }
  };

  // Language Selection Screen
  if (isDeveloper && !selectedLang) {
    return (
      <div className="min-h-screen bg-[#f0f4f8] font-sans">
        <div className="w-full px-6 py-4 bg-[#1e6091] flex items-center gap-4">
          <Link to="/" className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 rounded-xl text-xs font-black text-white hover:bg-white/30 transition-all normal-case tracking-normal">
            <ChevronRight size={12} className="rotate-180" /> Back
          </Link>
          <span className="text-white uppercase font-black tracking-[0.3em] text-xs">Warm-Up Round • Choose Your Language</span>
        </div>
        <div className="px-10 py-8 flex flex-col items-center justify-center min-h-[80vh]">
          <h3 className="text-2xl font-black text-slate-800 mb-2 uppercase tracking-tighter">Choose Language</h3>
          <p className="text-slate-400 text-xs font-bold mb-8 uppercase tracking-widest">Select your core stack</p>
          <div className="grid grid-cols-3 gap-4 w-full max-w-xl">
            {Object.keys(rolePool).map(lang => (
              <button
                key={lang}
                onClick={() => setSelectedLang(lang)}
                className="py-5 bg-white text-[#1e6091] font-black rounded-2xl border-2 border-blue-100 hover:bg-[#1e6091] hover:text-white transition-all uppercase text-xs tracking-widest shadow-sm"
              >
                {lang}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f4f8] font-sans">

      {/* Full-width header */}
      <div className={`w-full px-6 py-4 text-white font-black tracking-[0.3em] text-xs flex items-center gap-4 ${isDeveloper ? 'bg-[#1e6091]' : 'bg-emerald-500'}`}>
        <Link to="/" className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 rounded-xl text-xs font-black text-white hover:bg-white/30 transition-all normal-case tracking-normal">
          <ChevronRight size={12} className="rotate-180" /> Back
        </Link>
        <span className="uppercase">Warm-Up Round • {selectedLang || 'General'}</span>
      </div>

      <div className="w-full px-10 py-6">
        {!showSummary ? (
          <>
            {/* Top bar: Q number + nav */}
            <div className="flex justify-between items-center mb-6">
              <span className="text-xs font-black text-blue-500 uppercase bg-blue-50 px-4 py-1.5 rounded-full">
                Question {step + 1} of {questions.length}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handlePrev}
                  disabled={step === 0}
                  className="px-4 py-1.5 bg-white rounded-xl text-[10px] font-black text-slate-400 hover:bg-slate-100 hover:text-blue-600 disabled:opacity-20 transition-all uppercase border border-slate-200"
                >
                  Prev
                </button>
                <button
                  onClick={handleNext}
                  disabled={step === questions.length - 1}
                  className="px-4 py-1.5 bg-white rounded-xl text-[10px] font-black text-slate-400 hover:bg-slate-100 hover:text-blue-600 disabled:opacity-20 transition-all uppercase border border-slate-200"
                >
                  Next
                </button>
              </div>
            </div>

            {/* Question */}
            <h3 className="text-xl font-bold text-slate-800 mb-6 leading-snug max-w-3xl">
              {questions[step]?.q}
            </h3>

            {/* Options - 2 column grid */}
            <div className="grid grid-cols-2 gap-3 mb-6 max-w-4xl">
              {questions[step]?.options.map((o, i) => (
                <button
                  key={i}
                  onClick={() => handleAns(i)}
                  className={`w-full p-4 rounded-xl border-2 transition-all font-semibold text-sm text-left ${selectedAnswers[step] === i
                    ? 'border-[#1e6091] bg-blue-50 text-[#1e6091]'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                    }`}
                >
                  <span className="mr-2 text-slate-300 font-black text-xs">
                    {String.fromCharCode(65 + i)}.
                  </span>
                  {o}
                </button>
              ))}
            </div>

            {/* Continue button */}
            <button
              onClick={handleNext}
              disabled={selectedAnswers[step] === undefined}
              className={`px-10 py-3 text-white rounded-xl font-black shadow-md active:scale-95 transition-all text-xs tracking-widest uppercase disabled:opacity-50 ${isDeveloper ? 'bg-[#1e6091]' : 'bg-emerald-500'}`}
            >
              {step === questions.length - 1 ? "FINISH WARM-UP" : "CONTINUE →"}
            </button>
          </>
        ) : (
          /* Summary Screen */
          <div className="flex flex-col items-center justify-center min-h-[70vh] animate-in zoom-in">
            <Award size={64} className="text-emerald-500 mb-6 drop-shadow-lg" />
            <h3 className="text-2xl font-black text-slate-800 mb-2">Round Complete!</h3>
            <p className="text-slate-400 font-bold text-sm mb-2">
              You scored <span className="text-emerald-500">{localScore}</span> out of {questions.length}
            </p>
            <p className="text-slate-400 font-bold text-sm mb-8">
              Session Accuracy: <span className="text-[#1e6091] font-black">{Math.round((localScore / questions.length) * 100)}%</span>
            </p>

            {/* Answer Review */}
            <div className="w-full max-w-2xl mb-8 space-y-3">
              {questions.map((q, i) => {
                const userAns = selectedAnswers[i];
                const isCorrect = userAns === q.correct;
                return (
                  <div
                    key={i}
                    className={`p-4 rounded-xl border-2 text-sm ${isCorrect ? 'border-emerald-200 bg-emerald-50' : 'border-red-100 bg-red-50'}`}
                  >
                    <p className="font-bold text-slate-700 mb-1">{q.q}</p>
                    <p className={`text-xs font-black ${isCorrect ? 'text-emerald-600' : 'text-red-500'}`}>
                      {isCorrect ? '✓ Correct' : `✗ You chose: ${q.options[userAns] ?? 'Skipped'} — Correct: ${q.options[q.correct]}`}
                    </p>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => navigate('/')}
              className="px-10 py-3 bg-slate-900 text-white rounded-xl font-black shadow-xl hover:bg-black transition-all text-xs tracking-widest uppercase"
            >
              Back to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
// --- PERFORMANCE DASHBOARD ---
const PerformanceRound = ({ score, feedback }) => {
  const accuracy = Math.min(100, Math.round((score / 3) * 100));
  const technical = Math.min(100, accuracy + 10);

  const data = [
    { day: '1', accuracy: 20, response: 40, sessions: 10 },
    { day: '2', accuracy: 30, response: 45, sessions: 15 },
    { day: '3', accuracy: 35, response: 50, sessions: 20 },
    { day: '4', accuracy: 40, response: 42, sessions: 25 },
    { day: '5', accuracy: 38, response: 55, sessions: 22 },
    { day: '6', accuracy: 50, response: 60, sessions: 30 },
    { day: '7', accuracy: 55, response: 58, sessions: 35 },
    { day: '8', accuracy: accuracy, response: technical, sessions: 40 },
  ];

  const CircleGauge = ({ value, label, color }) => {
    const r = 48;
    const circ = 2 * Math.PI * r;
    const offset = circ - (circ * value) / 100;
    return (
      <div className="flex flex-col items-center">
        <div className="relative w-28 h-28 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 112 112">
            <circle cx="56" cy="56" r={r} stroke="#f1f5f9" strokeWidth="10" fill="transparent" />
            <circle
              cx="56" cy="56" r={r}
              stroke={color} strokeWidth="10" fill="transparent"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute text-center">
            <span className="text-2xl font-black text-slate-800 block">{value}</span>
          </div>
        </div>
        <p className="text-xs font-black text-slate-500 uppercase tracking-widest mt-2">{label}</p>
      </div>
    );
  };

  const resumeData = (() => {
    try { return JSON.parse(localStorage.getItem('resume_data')); } catch { return null; }
  })();
  const skills = resumeData?.skills || ["Problem Solving", "Communication", "Analytical Thinking"];

  return (
    <div className="w-full bg-[#f8fafc] font-sans min-h-screen">

      {/* Header */}
      <div className="px-8 py-1.5 bg-[#1e6091] border-b border-[#1a5276] flex items-center gap-3">
        <Link to="/" className="flex items-center gap-1.5 px-3 py-1 bg-white/20 rounded-xl text-[10px] font-black text-white hover:bg-white/30 transition-all normal-case tracking-normal">
  <ChevronRight size={12} className="rotate-180" /> Back
</Link>
        <div>
         <h1 className="text-base font-black text-white tracking-tight uppercase leading-none">Performance Dashboard</h1>
<p className="text-white/50 mt-0.5 font-bold uppercase text-[10px] tracking-widest">Real-time Session Data</p>
        </div>
      </div>

      <div className="p-6 space-y-5 max-w-5xl mx-auto">

        {/* Top Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-lg font-black text-slate-800">Your Progress</h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Session performance overview</p>
            </div>
            <span className="text-xs font-black text-[#1e6091] uppercase tracking-widest bg-blue-50 px-3 py-1.5 rounded-full">
              Specific Skills
            </span>
          </div>

          <div className="flex gap-10 items-center">
            {/* Gauges */}
            <div className="flex gap-8">
              <CircleGauge value={accuracy} label="Overall Score" color="#1565C0" />
              <CircleGauge value={technical} label="Technical Score" color="#00C853" />
            </div>

            {/* Divider */}
            <div className="h-32 w-px bg-slate-100" />

            {/* Legend */}
            <div className="space-y-4 flex-1">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Technical Skills</p>
              {[
                { label: "Accuracy", value: `${accuracy}%`, color: "#1565C0", icon: "◎" },
                { label: "Response Quality", value: `${technical}%`, color: "#00C853", icon: "◈" },
                { label: "Sessions Completed", value: score > 0 ? "Active" : "Pending", color: "#8b5cf6", icon: "▣" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span style={{ color: item.color }} className="text-lg">{item.icon}</span>
                  <span className="text-sm font-bold text-slate-600 flex-1">{item.label}</span>
                  <span className="text-xs font-black" style={{ color: item.color }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chart Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex justify-between items-center mb-5">
            <p className="text-sm font-black text-slate-700 uppercase tracking-widest">Skill Improvement Over Time</p>
            <div className="flex gap-4 text-[10px] font-black uppercase tracking-widest">
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[#1e6091] inline-block rounded"></span>Accuracy</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-emerald-500 inline-block rounded"></span>Response</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-purple-500 inline-block rounded"></span>Sessions</span>
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" axisLine={false} tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} dy={8} />
                <YAxis hide domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', padding: '10px' }}
                  itemStyle={{ fontWeight: '900', fontSize: '11px' }}
                />
                <Line type="monotone" dataKey="accuracy" stroke="#1565C0" strokeWidth={2.5}
                  dot={{ r: 4, fill: '#1e6091', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="response" stroke="#00C853" strokeWidth={2.5}
                  dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="sessions" stroke="#8b5cf6" strokeWidth={2.5}
                  dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Skills from Resume */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
            {resumeData ? 'Resume Skills Being Evaluated' : 'Core Competencies'}
          </p>
          <div className="flex flex-wrap gap-2">
            {skills.slice(0, 12).map((s, i) => (
              <span key={i} className="text-[10px] font-black px-3 py-1.5 bg-blue-50 text-[#1e6091] rounded-xl border border-blue-100">
                {s}
              </span>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
// --- RESTORED: READINESS REPORT PAGE ---
const ReadinessReport = ({ score, feedback }) => {
  const resumeData = (() => {
    try { return JSON.parse(localStorage.getItem('resume_data')); }
    catch { return null; }
  })();

  const accuracy = Math.round((score / 3) * 100);

  const techKeywords = ["React", "Node", "Python", "Java", "C++", "SQL", "AWS", "Docker", "Git", "MongoDB", "TypeScript", "REST", "API"];
  const resumeSkills = resumeData?.skills || [];
  const matchedSkills = resumeSkills.filter(s => techKeywords.some(k => s.toLowerCase().includes(k.toLowerCase())));
  const alignmentScore = resumeSkills.length > 0 ? Math.min(100, Math.round((matchedSkills.length / resumeSkills.length) * 100) + 30) : null;

  return (
    <div className="min-h-screen bg-[#f0f4f8] flex flex-col font-sans">

      {/* Header */}
      <div className="w-full px-8 py-2.5 bg-[#1e6091] border-b border-[#1a5276] flex items-center gap-3">
  <Link to="/" className="flex items-center gap-1.5 px-3 py-1 bg-white/20 rounded-xl text-[10px] font-black text-white hover:bg-white/30 transition-all normal-case tracking-normal">
    <ChevronRight size={12} className="rotate-180" /> Back
  </Link>
  <div className="flex-1 flex justify-center">
    <h1 className="text-base font-black text-white flex items-center gap-2 uppercase tracking-tight">
      <ShieldCheck className="text-white/80" size={18} /> Readiness Report
    </h1>
  </div>
  <div className="w-[72px]" />
</div>

      {/* Content */}
    <div className="flex flex-col items-center py-8 px-6 pb-16 min-h-[calc(100vh-120px)] justify-center">
  <div className="w-full max-w-3xl mx-auto flex flex-col gap-6">

          {/* Resume Alignment Card */}
          {resumeData && (
            <div className="w-full bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-50 flex items-center gap-2">
                <FileText size={14} className="text-[#1e6091]" />
                <span className="text-xs font-black text-slate-700 uppercase tracking-widest">Resume Alignment</span>
              </div>
              <div className="p-6">
                <div className="mb-4">
                  <p className="text-base font-black text-slate-800">{resumeData.name || "—"}</p>
                  <p className="text-xs text-slate-400 font-medium">{resumeData.role || "—"}</p>
                </div>
                {alignmentScore !== null && (
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Skills Match</span>
                      <span className="text-xs font-black text-[#1e6091]">{alignmentScore}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#1e6091] to-[#168aad] rounded-full transition-all duration-1000"
                        style={{ width: `${alignmentScore}%` }}
                      />
                    </div>
                  </div>
                )}
                {resumeSkills.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Detected Skills</p>
                    <div className="flex flex-wrap gap-1.5">
                      {resumeSkills.slice(0, 8).map((s, i) => (
                        <span key={i} className={`text-[10px] font-black px-2.5 py-1 rounded-lg border ${matchedSkills.includes(s)
                          ? 'bg-blue-50 text-[#1e6091] border-blue-100'
                          : 'bg-slate-50 text-slate-400 border-slate-100'
                          }`}>
                          {s}
                        </span>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-300 mt-2 font-medium">Blue = matched to role requirements</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Report Card */}
          <div className="w-full">
  <ReportCard score={score} feedback={feedback} />
</div>

          <p className="text-center text-slate-400 text-[10px] uppercase tracking-widest font-bold mb-8">
            Assessment generated via live performance data.
          </p>

        </div>
      </div>
    </div>
  );
};

// --- AUTH PAGE ---
const AuthPage = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      const { signInWithPopup } = await import('firebase/auth');
      const { auth, googleProvider } = await import('./firebase');
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const userData = { name: user.displayName, email: user.email, avatar: user.photoURL };
      localStorage.setItem('auth_user', JSON.stringify(userData));
      onLogin(userData);
      navigate('/');
    } catch (err) {
      setError('Google login failed: ' + err.message);
    }
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');
    if (!form.email || !form.password) return setError('Please fill all fields.');
    if (!isLogin && !form.name) return setError('Name is required.');
    setLoading(true);

    try {
      const { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } = await import('firebase/auth');
      const { auth } = await import('./firebase');

      if (isLogin) {
        const result = await signInWithEmailAndPassword(auth, form.email, form.password);
        const user = result.user;
        const userData = { name: user.displayName || form.name || 'User', email: user.email };
        localStorage.setItem('auth_user', JSON.stringify(userData));
        onLogin(userData);
        navigate('/');
      } else {
        const result = await createUserWithEmailAndPassword(auth, form.email, form.password);
        await updateProfile(result.user, { displayName: form.name });
        const userData = { name: form.name, email: form.email };
        localStorage.setItem('auth_user', JSON.stringify(userData));
        onLogin(userData);
        navigate('/');
      }
    } catch (err) {
      if (err.code === 'auth/user-not-found') setError('No account found with this email.');
      else if (err.code === 'auth/wrong-password') setError('Incorrect password.');
      else if (err.code === 'auth/email-already-in-use') setError('Email already registered. Please sign in.');
      else if (err.code === 'auth/weak-password') setError('Password must be at least 6 characters.');
      else if (err.code === 'auth/invalid-email') setError('Invalid email address.');
      else setError(err.message);
    }
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!form.email) {
      setError('Please enter your email address first.');
      return;
    }
    try {
      const { sendPasswordResetEmail } = await import('firebase/auth');
      const { auth } = await import('./firebase');
      await sendPasswordResetEmail(auth, form.email);
      setError('');
      setSuccess(`Password reset link sent to ${form.email}. Check your inbox!`);
    } catch (err) {
      if (err.code === 'auth/user-not-found') setError('No account found with this email.');
      else setError('Failed to send reset email. Try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f2942] via-[#1e6091] to-[#168aad] flex items-center justify-center p-6 font-sans">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative">
        <div className="text-center mb-10">
          <h1 className="text-white font-black text-3xl tracking-tighter uppercase">Interview Simulator</h1>
          <p className="text-white/60 mt-3 text-sm font-medium">Your adaptive interview coach</p>
        </div>

        <div className="bg-white rounded-[40px] shadow-2xl overflow-hidden">
          <div className="flex border-b border-slate-100">
            <button
              onClick={() => { setIsLogin(true); setError(''); setSuccess(''); }}
              className={`flex-1 py-5 text-xs font-black uppercase tracking-widest transition-all ${isLogin ? 'text-[#1e6091] border-b-2 border-[#1e6091]' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(''); setSuccess(''); }}
              className={`flex-1 py-5 text-xs font-black uppercase tracking-widest transition-all ${!isLogin ? 'text-[#1e6091] border-b-2 border-[#1e6091]' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Create Account
            </button>
          </div>

          <div className="p-10">
            <h2 className="text-2xl font-black text-slate-800 mb-2">
              {isLogin ? 'Welcome back' : 'Get started'}
            </h2>
            <p className="text-slate-400 text-sm mb-8">
              {isLogin ? 'Sign in to continue your interview prep.' : 'Create an account to track your progress.'}
            </p>

            <div className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Full Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="Yashi Sahay"
                    className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 outline-none focus:border-[#1e6091] text-slate-700 font-bold text-sm transition-all bg-slate-50"
                  />
                </div>
              )}

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                  className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 outline-none focus:border-[#1e6091] text-slate-700 font-bold text-sm transition-all bg-slate-50"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    placeholder="••••••••"
                    className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 outline-none focus:border-[#1e6091] text-slate-700 font-bold text-sm transition-all bg-slate-50 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#1e6091] transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="px-5 py-3 bg-red-50 border border-red-100 rounded-2xl text-red-500 text-xs font-bold">
                  {error}
                </div>
              )}

              {success && (
                <div className="px-5 py-3 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-600 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 size={14} /> {success}
                </div>
              )}

              {isLogin && (
                <div className="text-right">
                  <button onClick={handleForgotPassword} className="text-xs font-bold text-[#1e6091] hover:underline">
                    Forgot password?
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full mt-8 py-5 bg-gradient-to-r from-[#1e6091] to-[#168aad] text-white rounded-2xl font-black shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-95 transition-all text-xs tracking-widest uppercase disabled:opacity-60"
            >
              {loading ? 'Authenticating...' : isLogin ? 'Sign In →' : 'Create Account →'}
            </button>

            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-slate-100"></div>
              <span className="text-[10px] font-black text-slate-300 uppercase">or continue with</span>
              <div className="flex-1 h-px bg-slate-100"></div>
            </div>

            <button
              onClick={handleGoogleLogin}
              className="w-full py-3 border-2 border-slate-100 rounded-2xl text-xs font-black text-slate-500 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>
          </div>
        </div>

        <p className="text-center text-white/40 text-[10px] mt-8 uppercase tracking-widest font-bold">
          Secured by Interview Simulator • All data encrypted
        </p>
      </div>
    </div>
  );
};
const InterviewRoom = () => (
  <div className="p-20 text-center bg-slate-900 text-white min-h-screen font-sans">
    <h1 className="text-2xl font-bold uppercase tracking-widest">Live AI Simulation</h1>
    <Link to="/" className="mt-6 inline-block text-emerald-400 underline">End Session</Link>
  </div>
);

const SettingsModal = ({ isOpen, onClose, user, selectedRole, setSelectedRole, onLogout }) => {
  const { darkMode, setDarkMode } = React.useContext(ThemeContext);
  const [activeTab, setActiveTab] = useState('profile');
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [notifications, setNotifications] = useState(true);
  const [saved, setSaved] = useState(false);



  if (!isOpen) return null;

  const handleSave = () => {
    const updated = { ...user, name, email };
    localStorage.setItem('auth_user', JSON.stringify(updated));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: <User size={14} /> },
    { id: 'preferences', label: 'Preferences', icon: <Palette size={14} /> },
    { id: 'account', label: 'Account', icon: <Lock size={14} /> },
  ];

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-[#1e6091] p-2 rounded-xl text-white">
              <Settings size={16} />
            </div>
            <h2 className="text-base font-black text-slate-800 uppercase tracking-tight">Settings</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-7">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 py-3 px-4 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 -mb-px ${activeTab === t.id
                ? 'border-[#1e6091] text-[#1e6091]'
                : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-7 space-y-5">

          {activeTab === 'profile' && (
            <>
              {/* Avatar */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-[#1e6091] text-white flex items-center justify-center font-black text-2xl shadow-md">
                  {name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="font-black text-slate-800">{name || 'User'}</p>
                  <p className="text-xs text-slate-400">{email}</p>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Full Name</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 outline-none focus:border-[#1e6091] text-slate-700 font-bold text-sm bg-slate-50 transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Email</label>
                <input
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 outline-none focus:border-[#1e6091] text-slate-700 font-bold text-sm bg-slate-50 transition-all"
                />
              </div>
            </>
          )}

          {activeTab === 'preferences' && (
            <>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Interview Role</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Software Developer', 'Data Analyst', 'Product Manager', 'Finance Professional'].map(role => (
                    <button
                      key={role}
                      onClick={() => setSelectedRole(role)}
                      className={`py-2.5 px-3 rounded-xl border-2 text-[10px] font-black uppercase tracking-wider transition-all ${selectedRole === role
                        ? 'border-[#1e6091] bg-blue-50 text-[#1e6091]'
                        : 'border-slate-100 text-slate-400 hover:border-slate-200'
                        }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-slate-50">
                <div>
                  <p className="text-sm font-black text-slate-700">Email Notifications</p>
                  <p className="text-[10px] text-slate-400">Receive session summaries</p>
                </div>
                <button
                  onClick={() => setNotifications(!notifications)}
                  className={`w-11 h-6 rounded-full transition-all relative ${notifications ? 'bg-[#1e6091]' : 'bg-slate-200'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all shadow-sm ${notifications ? 'left-6' : 'left-1'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-black text-slate-700">Dark Mode</p>
                  <p className="text-[10px] text-slate-400">{darkMode ? 'On' : 'Off'}</p>
                </div>
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className={`w-11 h-6 rounded-full transition-all relative ${darkMode ? 'bg-[#1e6091]' : 'bg-slate-200'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all shadow-sm ${darkMode ? 'left-6' : 'left-1'}`} />
                </button>
              </div>
            </>
          )}

          {activeTab === 'account' && (
            <>
              <div className="bg-slate-50 rounded-2xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">Account Type</span>
                  <span className="font-black text-[#1e6091]">Free Plan</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">Sessions Used</span>
                  <span className="font-black text-slate-700">Unlimited</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">Data Storage</span>
                  <span className="font-black text-slate-700">Local Only</span>
                </div>
              </div>

              <button
                onClick={() => { localStorage.clear(); onLogout(); onClose(); }}
                className="w-full py-3 border-2 border-red-100 text-red-500 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-red-50 transition-all"
              >
                Clear All Data & Logout
              </button>

              <button
                onClick={() => { localStorage.removeItem('global_score'); localStorage.removeItem('resume_data'); onClose(); window.location.reload(); }}
                className="w-full py-3 border-2 border-slate-100 text-slate-400 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all"
              >
                Reset Progress Only
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        {activeTab !== 'account' && (
          <div className="px-7 pb-6">
            <button
              onClick={handleSave}
              className="w-full py-3.5 bg-[#1e6091] text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#168aad] transition-all shadow-md"
            >
              {saved ? '✓ Saved!' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const Navbar = ({ totalScore, user, onLogout, onSettingsOpen }) => {
  const navigate = useNavigate();
  return (
    <nav className="fixed top-0 left-0 w-full bg-[#1e6091] border-b border-[#1a5276] z-[1000] px-8 py-4 flex justify-between items-center font-sans shadow-sm">
      <div onClick={() => navigate('/')} className="flex items-center gap-3 cursor-pointer group">
        <div className="bg-white/20 p-2 rounded-xl text-white shadow-lg group-hover:scale-110 transition-transform">
          <LayoutGrid size={20} />
        </div>
        <span className="text-xl font-black text-white tracking-tighter uppercase">Interview Simulator</span>
      </div>
      <div className="flex items-center gap-4">
        {user && (
          <>
            <button onClick={() => navigate('/')} className="flex items-center gap-2 text-sm font-semibold text-white/90 hover:text-white px-5 py-2 rounded-lg hover:bg-white/10 transition-all">
  <Home size={17} /> Home
</button>
<button onClick={onSettingsOpen} className="flex items-center gap-2 text-sm font-semibold text-white/90 hover:text-white px-5 py-2 rounded-lg hover:bg-white/10 transition-all">
  <Settings size={17} /> Settings
</button>
            <div className="h-5 w-[1px] bg-white/10 mx-2"></div>
            <button onClick={onLogout} className="flex items-center gap-2 text-sm font-semibold text-red-400 hover:text-red-300 px-5 py-2 rounded-lg hover:bg-red-500/10 transition-all border border-red-400/30 hover:border-red-400/60">
  Logout
</button>
          </>
        )}
      </div>
    </nav>
  );
};
// --- MAIN ROUTER ---
export default function App() {
  const [totalScore, setTotalScore] = useState(0);
  const [selectedRole, setSelectedRole] = useState(() => {
    try {
      const resume = JSON.parse(localStorage.getItem('resume_data'));
      const langs = resume?.languages || [];
      if (langs.some(l => ["Python", "C++", "Java"].includes(l))) return "Software Developer";
    } catch { }
    return "Software Developer";
  });
  const [aiFeedback, setAiFeedback] = useState({ coding: "", personalized: "" });

  const [resumeData, setResumeData] = useState(() => {
    const authUser = localStorage.getItem('auth_user');
    if (authUser) {
      const saved = localStorage.getItem('resume_data');
      if (saved !== null) return JSON.parse(saved);
    }
    return undefined;
  });

  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('auth_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('dark_mode') === 'true');

  useEffect(() => {
    const applyDarkMode = () => {
      if (darkMode) {
        document.body.style.backgroundColor = '#0f172a';
        document.body.style.color = '#f1f5f9';
        document.body.style.transition = 'all 0.3s ease';

        const allEls = document.querySelectorAll(
          'div, section, nav, header, main, aside, span, p, h1, h2, h3, h4, button, input, textarea, select, a'
        );
        allEls.forEach(el => {
          const computed = window.getComputedStyle(el);
          const bg = computed.backgroundColor;
          const color = computed.color;

          if (bg === 'rgb(255, 255, 255)') el.style.backgroundColor = '#1e293b';
          else if (bg === 'rgb(248, 250, 252)') el.style.backgroundColor = '#0f172a';
          else if (bg === 'rgb(240, 244, 248)') el.style.backgroundColor = '#0f172a';
          else if (bg === 'rgb(241, 245, 249)') el.style.backgroundColor = '#1e293b';
          else if (bg === 'rgb(248, 249, 250)') el.style.backgroundColor = '#1e293b';

          if (color === 'rgb(30, 41, 59)') el.style.color = '#f1f5f9';
          else if (color === 'rgb(51, 65, 85)') el.style.color = '#cbd5e1';
          else if (color === 'rgb(71, 85, 105)') el.style.color = '#94a3b8';
          else if (color === 'rgb(100, 116, 139)') el.style.color = '#64748b';
          else if (color === 'rgb(15, 23, 42)') el.style.color = '#f1f5f9';
        });

      } else {
        document.body.style.backgroundColor = '';
        document.body.style.color = '';
        document.body.style.transition = 'all 0.3s ease';

        const allEls = document.querySelectorAll(
          'div, section, nav, header, main, aside, span, p, h1, h2, h3, h4, button, input, textarea, select, a'
        );
        allEls.forEach(el => {
          el.style.backgroundColor = '';
          el.style.color = '';
        });
      }

      localStorage.setItem('dark_mode', darkMode ? 'true' : 'false');
    };

    // Run immediately on toggle
    applyDarkMode();

    // Re-run whenever new elements are added to DOM (page navigation)
    const observer = new MutationObserver(() => {
      applyDarkMode();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Cleanup observer when effect reruns
    return () => observer.disconnect();

  }, [darkMode]);

  useEffect(() => {
    const saved = localStorage.getItem('global_score');
    if (saved) {
      const parsed = parseInt(saved);
      setTotalScore(parsed > 3 ? 3 : parsed);
    }
  }, []);
   useEffect(() => {
  localStorage.setItem('global_score', totalScore);
  // Save score to Firestore
  const syncScore = async () => {
    const { auth } = await import('./firebase');
    const currentUser = auth.currentUser;
    if (currentUser) {
      await saveUserData(currentUser.uid, { totalScore });
    }
  };
  syncScore();
}, [totalScore]);

  const handleLogin = async (userData) => {
  setUser(userData);
  setResumeData(undefined);

  // Load saved data from Firestore
  const { auth } = await import('./firebase');
  const currentUser = auth.currentUser;
  if (currentUser) {
    const saved = await loadUserData(currentUser.uid);
    if (saved) {
      if (saved.resumeData) {
        setResumeData(saved.resumeData);
        localStorage.setItem('resume_data', JSON.stringify(saved.resumeData));
      }
      if (saved.totalScore) {
        setTotalScore(saved.totalScore);
      }
    }
  }
};
 const handleLogout = async () => {
  try {
    const { auth } = await import('./firebase');
    const { signOut } = await import('firebase/auth');
    await signOut(auth);
  } catch (e) {
    console.error("Logout error:", e);
  }
  localStorage.clear();
  setUser(null);
  setResumeData(undefined);
  setTotalScore(0);
};

 const handleResumeComplete = async (data) => {
  setResumeData(data);
  // Save to Firestore
  const { auth } = await import('./firebase');
  const currentUser = auth.currentUser;
  if (currentUser) {
    await saveUserData(currentUser.uid, { resumeData: data });
  }
};

  return (
    <ThemeContext.Provider value={{ darkMode, setDarkMode }}>
      <Router>
        <Navbar totalScore={totalScore} user={user} onLogout={handleLogout} onSettingsOpen={() => setSettingsOpen(true)} />

        <div className="pt-16">
          <Routes>
            <Route path="/auth" element={<AuthPage onLogin={handleLogin} />} />

            <Route path="/resume" element={
              user ? <ResumePage onResumeComplete={handleResumeComplete} /> : <Navigate to="/auth" />
            } />

            <Route path="/" element={
              !user ? <Navigate to="/auth" /> :
                resumeData === undefined ? <Navigate to="/resume" /> :
                  <Dashboard totalScore={totalScore} />
            } />

            <Route path="/interview" element={<InterviewRoom />} />
            <Route path="/warmup" element={<WarmUpRound setGlobalScore={setTotalScore} selectedRole={selectedRole} />} />
            <Route path="/coding" element={<AIModuleRoom type="coding" selectedRole={selectedRole} setAiFeedback={setAiFeedback} resumeData={resumeData} />} />
            <Route path="/personalized" element={<AIModuleRoom type="personalized" selectedRole={selectedRole} setAiFeedback={setAiFeedback} resumeData={resumeData} />} />
            <Route path="/performance" element={<PerformanceRound score={totalScore} />} />
            <Route path="/readiness" element={<ReadinessReport score={totalScore} feedback={aiFeedback} />} />
            <Route path="/industry" element={<IndustryModules />} />
            <Route path="/industry/:type" element={<IndustryContent />} />
          </Routes>
        </div>

        <div className={`fixed bottom-6 left-6 z-[1000] ${!user ? 'hidden' : ''} ${resumeData ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="bg-white border border-slate-200 p-2 rounded-2xl shadow-2xl flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl text-white shadow-md">
              <Briefcase size={16} />
            </div>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="outline-none text-xs font-bold text-slate-600 bg-transparent pr-4 cursor-pointer"
            >
              <option>Software Developer</option>
              <option>Data Analyst</option>
              <option>Product Manager</option>
              <option>Finance Professional</option>
            </select>
            <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
              <Settings size={14} />
            </button>
          </div>
        </div>
        {user && (
  <SettingsModal
    isOpen={settingsOpen}
    onClose={() => setSettingsOpen(false)}
    user={user}
    selectedRole={selectedRole}
    setSelectedRole={setSelectedRole}
    onLogout={handleLogout}
  />
)}
      </Router>
    </ThemeContext.Provider>
  );
}
