import { Transaction, Scenario } from './types';

export const INITIAL_TRANSACTIONS: Transaction[] = [];

export const SCENARIOS: Scenario[] = [
  {
    id: 'expansion',
    name: 'Hire & Office Expansion',
    description: 'Hire 2 new senior developers ($8,000/mo each) and upgrade the workspace subscription (+$1,500/mo) starting June 1st.',
    defaultPrompt: 'Model the impact of hiring 2 senior developers at $8,000/month each starting on June 1st, 2026, and upgrading the co-working/office layout which costs an additional $1,500/month in Rent & Space.',
    estimatedImpact: '-$17,500 monthly cash drain, high leverage requirement.',
  },
  {
    id: 'client_churn',
    name: 'Major Retainer Churn',
    description: 'Lose our largest client retainer ($11,500/mo Acme Corp) starting June 1st.',
    defaultPrompt: 'Model losing our main retaining customer (Acme Corp retainer, value $11,500/month) starting from June 1st, 2026. Predict our risk score and survivability.',
    estimatedImpact: '-25% revenue decline, substantial impact on safety runway.',
  },
  {
    id: 'new_contract',
    name: 'Enterprise Client Contract Win',
    description: 'Win an enterprise branding contract adding $25,000 upfront in June and a recurring $6,000/mo support retainer from July onwards.',
    defaultPrompt: 'Win an enterprise contract bringing $25,000 cash on June 15th, 2026 and a monthly sales retainer of $6,000 starting July 5th, 2026. Calculate runway and growth options.',
    estimatedImpact: '+$25,000 immediate intake, +$6,000 recurring monthly support.',
  },
  {
    id: 'tax_relief',
    name: 'R&D Tax Relief Credit',
    description: 'Receive a government tax credit reimbursement of $35,000 in early July.',
    defaultPrompt: 'SME receives a government R&D technology tax relief reimbursement of $35,000 cash in July 2026. Give recommendations on capital allocation.',
    estimatedImpact: '+$35,000 lump sum inflow, extending the runway for tech R&D investments.',
  },
];
