export interface Transaction {
  id: string;
  description: string;
  amount: number; // positive for inflow, negative for outflow
  type: 'inflow' | 'outflow';
  category: string;
  date: string; // YYYY-MM-DD
  status: 'completed' | 'pending' | 'projected';
}

export interface MetricSummary {
  currentBalance: number;
  projectedInflow: number;
  projectedOutflow: number;
  netCashFlow: number;
  runwayMonths: number;
  burnRate: number;
  quickRatio: number;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  defaultPrompt: string;
  estimatedImpact: string;
}

export interface ScenarioPrediction {
  scenarioName: string;
  riskScore: number; // 0 to 100
  financialHealthRating: 'Excellent' | 'Good' | 'Fair' | 'Critical';
  analysis: string; // Markdown summary
  recommendations: string[];
  projectedTransactions: Omit<Transaction, 'id'>[]; // new predicted transactions (to be mapped to full Transaction on arrival)
  runwayMonthsImpact: number; // change in runway or absolute runway value
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
}

export interface InvoiceEstimate {
  officialDueDate: string;
  predictedPaymentDate: string;
  delayDays: number;
  probabilityOnTime: number;
  riskLevel: string;
  analysis: string;
  mitigationSteps: string[];
}
