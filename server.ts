import express from 'express';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

// Initialize Gemini client on the server
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // HEALTH CHECK ENDPOINT
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // 1. AI SCENARIO PREDICT ENDPOINT (Using Structured JSON Output)
  app.post('/api/predict', async (req, res) => {
    try {
      const { transactions, scenarioPrompt, currentBalance } = req.body;

      if (!transactions || !Array.isArray(transactions)) {
        return res.status(400).json({ error: 'Missing or invalid transactions list.' });
      }

      const payload = {
        currentDate: '2026-05-20',
        initialBalance: currentBalance || 50000,
        recentLedger: transactions.slice(-30), // take last 30 for token optimization
        scenarioRequest: scenarioPrompt || "Receive cash relief or execute normal operations."
      };

      const promptMessage = `
You are a highly experienced Chief Financial Officer (CFO) and SME advisory AI.
Assess the financial health and cashflow situation of our business given the current transactions, ledger history, and initial starting balance.
Evaluate the following business decision/external scenario: "${payload.scenarioRequest}".

Current business context settings:
- Current date of calculation: ${payload.currentDate}
- Initial Starting Cash Reserve: $${payload.initialBalance}
- Recent Ledger (last 30 transactions): ${JSON.stringify(payload.recentLedger)}

Perform a rigorous double-entry compatible cashflow projection modeling from May 2026 to November 2026 under this scenario.
Generate:
1. Scenario Name summarizing the simulation.
2. A numeric Risk Score (0 = absolutely safe, 100 = default threat).
3. A strategic markdown text analysis summarizing the trade-offs, potential threats, and cash dip-points.
4. Actionable cash advice recommendations (at least 3-4 professional financial recommendations).
5. A list of exactly 3 to 8 projected future transactions (as a positive or negative amount) that model this scenario's specific financial impact over May-November 2026. For example:
   - If hiring a developer, create recurring monthly outflow transactions starting June 2026.
   - If losing revenue, add negative adjustment transactions.
   - If winning a project, add inflows.
   Ensure dates are in YYYY-MM-DD format (usually from June to Sept/Oct 2026).
6. Calculated effect on the runway (in months) - use positive numbers for runway gains, negative numbers for runway decreases.
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: promptMessage,
        config: {
          systemInstruction: 'You are an elite SME CFO financial analysis agent. You parse transactions, compute runway impacts, and output perfectly structured JSON data following schemas.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              scenarioName: { type: Type.STRING },
              riskScore: { type: Type.INTEGER, description: 'Risk score from 0 (very low risk) to 100 (critical bottleneck)' },
              financialHealthRating: { type: Type.STRING, description: 'Excellent, Good, Fair, or Critical' },
              analysis: { type: Type.STRING, description: 'CFO markdown analysis of scenario balance implications' },
              recommendations: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Clear tactical mitigating advice points'
              },
              projectedTransactions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    description: { type: Type.STRING, description: 'Short description of the predicted flow' },
                    amount: { type: Type.NUMBER, description: 'Amount. Positive for inflow, negative for outflow' },
                    type: { type: Type.STRING, description: "Must be 'inflow' or 'outflow'" },
                    category: { type: Type.STRING, description: 'salaries, Rent, Marketing, Taxes, SaaS, Sales Retainer, etc.' },
                    date: { type: Type.STRING, description: 'YYYY-MM-DD format, after May 20, 2026' },
                    status: { type: Type.STRING, description: "Value must be 'projected'" }
                  },
                  required: ['description', 'amount', 'type', 'category', 'date', 'status']
                }
              },
              runwayMonthsImpact: { type: Type.NUMBER, description: 'Runway change in months, e.g. -1.5, +3, 0' }
            },
            required: ['scenarioName', 'riskScore', 'financialHealthRating', 'analysis', 'recommendations', 'projectedTransactions', 'runwayMonthsImpact']
          }
        }
      });

      const bodyText = response.text;
      if (!bodyText) {
        throw new Error('Gemini returned an empty response.');
      }

      res.json(JSON.parse(bodyText));
    } catch (err: any) {
      console.error('Error in /api/predict:', err);
      res.status(500).json({ error: err.message || 'An error occurred during prediction.' });
    }
  });

  // 2. AI CFO ADVICE TERMINAL (Chat / Interactive Question Q&A)
  app.post('/api/advice', async (req, res) => {
    try {
      const { question, transactions, currentBalance } = req.body;

      if (!question) {
        return res.status(400).json({ error: 'Question is required.' });
      }

      const recentLedgerSummary = transactions ? JSON.stringify(transactions.slice(-25)) : 'No context loaded';

      const promptText = `
You are Kashflow's AI Financial Mentor and virtual CFO. 
The user is an SME business owner asking for strategic cashflow, operational, or tax advice.

Current Business Ledger Summary:
- Initial Cash Reserves: $${currentBalance || 50000}
- Active Cash Book: ${recentLedgerSummary}

User's Query: "${question}"

Provide a concise, direct, and elite financial answer in Markdown. Use bullet points and focus on practical steps:
- Give standard accounting guidance but explain it simply.
- Use concrete options (like negotiating payment terms, invoice factoring, or delaying overhead raises).
- Include brief mathematical examples or rule-of-thumb ratios where helpful.
Keep the advice highly personalized to small business constraints, professional, encouraging, and under 250 words.
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: promptText,
        config: {
          systemInstruction: 'You are an elite small business financial advisory co-pilot. You write friendly, crisp, expert responses using markdown table/formatting where useful.'
        }
      });

      res.json({ answer: response.text });
    } catch (err: any) {
      console.error('Error in /api/advice:', err);
      res.status(500).json({ error: err.message || 'An error occurred while generating advice.' });
    }
  });

  // 3. LIVE EXCHANGE RATES PROXY ENDPOINT
  app.get('/api/rates', async (req, res) => {
    try {
      const response = await fetch('https://open.er-api.com/v6/latest/USD');
      if (!response.ok) {
        throw new Error('Failed to fetch exchange rates from provider.');
      }
      const data = await response.json();
      res.json({
        rates: {
          USD: 1,
          EUR: data.rates.EUR || 0.92,
          GBP: data.rates.GBP || 0.79,
          NGN: data.rates.NGN || 1450.0,
          CAD: data.rates.CAD || 1.36,
          AUD: data.rates.AUD || 1.50,
          JPY: data.rates.JPY || 155.50,
          ZAR: data.rates.ZAR || 18.40,
          GHS: data.rates.GHS || 14.20,
          INR: data.rates.INR || 83.30
        },
        time_last_update_utc: data.time_last_update_utc || new Date().toISOString()
      });
    } catch (err: any) {
      console.error('Exchange rates fetch failed, serving offline-ready fallback rates:', err);
      res.json({
        rates: {
          USD: 1,
          EUR: 0.92,
          GBP: 0.79,
          NGN: 1450.0,
          CAD: 1.36,
          AUD: 1.50,
          JPY: 155.50,
          ZAR: 18.40,
          GHS: 14.20,
          INR: 83.30
        },
        error: 'Using fallback rates',
        time_last_update_utc: new Date().toISOString()
      });
    }
  });

  // 4. SMART INFLOW INVOICE ESTIMATOR ENDPOINT
  app.post('/api/estimate-invoice', async (req, res) => {
    try {
      const { clientName, amount, invoiceDate, terms, reliabilityNote } = req.body;

      if (!clientName || !amount || !invoiceDate || !terms) {
        return res.status(400).json({ error: 'Missing required fields for invoice risk modeling.' });
      }

      const promptText = `
You are an elite SME CFO and Credit Risk Collection Advisor.
Estimate the realistic cashflow intake parameters for this pending invoice:
- Client Business Name: "${clientName}"
- Invoice Amount (Base USD): $${amount}
- Billing Invoice Issue Date: ${invoiceDate}
- Agreed Payment Terms Protocol: "${terms}" (e.g. Net 15, Net 30, Net 45, Net 60, or Due on Receipt)
- Customer Profile / Payment reliability comments: "${reliabilityNote || 'No past telemetry recorded'}"

Establish realistic cash receipt prediction:
- Calculate the contract-agreed due date from billing terms.
- Overdue delays are common: calculate any likely credit friction delay in days beyond raw due date. If paid perfectly on-time, delay is 0.
- Create a forecast payment date (YYYY-MM-DD format).
- Provide structural Credit Analysis and dynamic cashflow acceleration mitigation tactics.
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: promptText,
        config: {
          systemInstruction: 'You are an advanced credit risk collection AI for SME cashflow planning. You output expert credit advice as clean JSON conforming to schemas.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              officialDueDate: { type: Type.STRING },
              predictedPaymentDate: { type: Type.STRING, description: 'YYYY-MM-DD expected settlement date' },
              delayDays: { type: Type.INTEGER, description: 'Friction delay in excess of raw due date' },
              probabilityOnTime: { type: Type.INTEGER, description: 'Likelihood score (0-100%) of prompt payment' },
              riskLevel: { type: Type.STRING, description: 'Low, Medium, or High risk of overdue burn' },
              analysis: { type: Type.STRING, description: 'Short CFO summary of predicted customer paying latency behavior' },
              mitigationSteps: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Pre-emptive cash collection speed-up tips'
              }
            },
            required: ['officialDueDate', 'predictedPaymentDate', 'delayDays', 'probabilityOnTime', 'riskLevel', 'analysis', 'mitigationSteps']
          }
        }
      });

      res.json(JSON.parse(response.text || '{}'));
    } catch (err: any) {
      console.error('Error in /api/estimate-invoice:', err);
      res.status(500).json({ error: err.message || 'An error occurred during invoice evaluation.' });
    }
  });

  // Vite server integrations
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
