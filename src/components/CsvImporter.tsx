import React, { useState, useRef } from 'react';
import { Transaction } from '../types';
import { Download, Upload, AlertCircle, CheckCircle2, ChevronDown, RefreshCw } from 'lucide-react';

interface CsvImporterProps {
  onImport: (newTransactions: Transaction[]) => void;
  activeCurrencySymbol: string;
}

export default function CsvImporter({ onImport, activeCurrencySymbol }: CsvImporterProps) {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState({
    date: '',
    description: '',
    amount: '',
    category: '',
    type: ''
  });
  const [previewData, setPreviewData] = useState<Omit<Transaction, 'id'>[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Download Sample CSV
  const handleDownloadTemplate = () => {
    const csvContent = 
      "Date,Description,Amount,Category,Type\n" +
      "2026-03-01,Enterprise Design retainer,12000,Project Revenue,inflow\n" +
      "2026-03-10,Web Hosting Cloud Compute,-450,SaaS & Infrastructure,outflow\n" +
      "2026-03-15,Tax Advisor retainer,-1200,Taxes,outflow\n" +
      "2026-03-24,Naira Cross-border Commission,8000,Project Revenue,inflow\n" +
      "2026-04-05,Office Utilities Expense,-350,Rent & Space,outflow";
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "lumina_historical_ledger_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Parsing helper that splits CSV lines respecting quotes
  const parseCSVText = (text: string) => {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return { headers: [], rows: [] };

    // Simple robust regex parser for nested quotes in CSV
    const splitCSVLine = (line: string) => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' || char === "'") {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim().replace(/^["']|["']$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim().replace(/^["']|["']$/g, ''));
      return result;
    };

    const firstLineHeaders = splitCSVLine(lines[0]);
    const cleanRowsData = lines.slice(1).map(line => splitCSVLine(line));

    return {
      headers: firstLineHeaders,
      rows: cleanRowsData
    };
  };

  const processFile = (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.csv')) {
      setErrorMsg('Invalid file type. Please select a .csv file.');
      return;
    }
    setErrorMsg('');
    setSuccessMsg('');
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers: csvHeaders, rows: csvRows } = parseCSVText(text);

      if (csvHeaders.length < 2) {
        setErrorMsg('The CSV file does not appear to contain valid headers or row data.');
        return;
      }

      setHeaders(csvHeaders);
      setRows(csvRows);

      // Simple auto-mapper guessing
      const guessedMapping = {
        date: csvHeaders.find(h => /date|time|day/i.test(h)) || csvHeaders[0] || '',
        description: csvHeaders.find(h => /desc|memo|details|name|title|payee/i.test(h)) || csvHeaders[1] || '',
        amount: csvHeaders.find(h => /amount|value|sum|cost|price/i.test(h)) || csvHeaders[2] || '',
        category: csvHeaders.find(h => /cat|tag|group|account/i.test(h)) || csvHeaders[3] || '',
        type: csvHeaders.find(h => /type|flow|direction/i.test(h)) || ''
      };
      setMapping(guessedMapping);
      generatePreview(csvHeaders, csvRows, guessedMapping);
    };
    reader.readAsText(selectedFile);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleMappingChange = (field: keyof typeof mapping, val: string) => {
    const updatedMapping = { ...mapping, [field]: val };
    setMapping(updatedMapping);
    generatePreview(headers, rows, updatedMapping);
  };

  const generatePreview = (
    csvHeaders: string[], 
    csvRows: string[][], 
    activeMap: typeof mapping
  ) => {
    const dateIdx = csvHeaders.indexOf(activeMap.date);
    const descIdx = csvHeaders.indexOf(activeMap.description);
    const amountIdx = csvHeaders.indexOf(activeMap.amount);
    const catIdx = csvHeaders.indexOf(activeMap.category);
    const typeIdx = csvHeaders.indexOf(activeMap.type);

    if (dateIdx === -1 || descIdx === -1 || amountIdx === -1) {
      setPreviewData([]);
      return;
    }

    const compiled: Omit<Transaction, 'id'>[] = [];

    csvRows.forEach((row) => {
      if (row.length < Math.max(dateIdx, descIdx, amountIdx)) return;

      const rawDate = row[dateIdx] || '2026-01-01';
      const cleanDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) 
        ? rawDate 
        : new Date(rawDate).toISOString().split('T')[0];

      const description = row[descIdx] || 'Historical Item';
      const rawAmount = parseFloat((row[amountIdx] || '0').replace(/[^0-9.-]/g, ''));
      if (isNaN(rawAmount)) return;

      const category = catIdx !== -1 && row[catIdx] ? row[catIdx] : 'Imported';
      
      // Determine type inflow/outflow
      let type: 'inflow' | 'outflow' = rawAmount >= 0 ? 'inflow' : 'outflow';
      if (typeIdx !== -1 && row[typeIdx]) {
        const rawType = row[typeIdx].toLowerCase();
        if (rawType.includes('out') || rawType.includes('expense') || rawType.includes('pay')) {
          type = 'outflow';
        } else if (rawType.includes('in') || rawType.includes('rev') || rawType.includes('sale')) {
          type = 'inflow';
        }
      }

      // Ensure amount corresponds to type (inflow positive, outflow negative)
      const adjustedAmount = type === 'outflow' ? -Math.abs(rawAmount) : Math.abs(rawAmount);

      compiled.push({
        description,
        amount: adjustedAmount,
        type,
        category,
        date: cleanDate,
        status: 'completed'
      });
    });

    setPreviewData(compiled);
  };

  const handleExecuteImport = () => {
    if (previewData.length === 0) {
      setErrorMsg('No valid data rows found to import.');
      return;
    }

    const finalizedList: Transaction[] = previewData.map((item, idx) => ({
      ...item,
      id: `tx-imported-${Date.now()}-${idx}`
    }));

    onImport(finalizedList);
    setSuccessMsg(`Successfully imported ${finalizedList.length} historical records into your Ledger State!`);
    resetImporter();
  };

  const resetImporter = () => {
    setFile(null);
    setHeaders([]);
    setRows([]);
    setMapping({
      date: '',
      description: '',
      amount: '',
      category: '',
      type: ''
    });
    setPreviewData([]);
  };

  return (
    <div className="bg-[#141519] border border-[#26272B] rounded-2xl p-6 shadow-xl" id="csv-ledger-importer-container">
      {/* Header Info */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-indigo-400 font-mono text-xs tracking-wider uppercase flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></span>
            CSV Bulk Ingestion Client
          </div>
          <h2 className="text-sm font-semibold text-white tracking-tight mt-1">
            Import Historical Spreadsheet Ledgers
          </h2>
        </div>
        <button
          onClick={handleDownloadTemplate}
          className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 bg-indigo-500/10 hover:bg-indigo-500/15 border border-indigo-500/25 rounded-lg px-2.5 py-1.5 font-mono"
          title="Download sample layout format as CSV"
        >
          <Download size={13} />
          Template.csv
        </button>
      </div>

      <p className="text-xs text-zinc-400 mb-5 leading-relaxed">
        Upload your company's past bank transactions. Map columns below to clean, convert, and stream them securely directly into the forecasts.
      </p>

      {/* Success / Error messaging banners */}
      {successMsg && (
        <div className="bg-emerald-500/15 border border-[#10b981]/25 text-[#10b981] px-4 py-3 rounded-xl text-xs flex items-start gap-2 mb-4">
          <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
          <p>{successMsg}</p>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-500/15 border border-rose-500/25 text-rose-400 px-4 py-3 rounded-xl text-xs flex items-start gap-2 mb-4">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <p>{errorMsg}</p>
        </div>
      )}

      {/* DND Drag Uploader Area */}
      {!file ? (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition duration-150 flex flex-col items-center justify-center ${
            isDragActive 
              ? 'border-indigo-400 bg-indigo-500/10' 
              : 'border-[#26272B] bg-[#0A0B0D] hover:border-indigo-500/30'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv"
            className="hidden"
          />
          <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-3">
            <Upload size={18} />
          </div>
          <span className="text-xs text-zinc-200 font-medium">Click to select, or drag & drop CSV file</span>
          <span className="text-[10px] text-zinc-500 mt-1 font-mono">Accepts comma-delimited ledger columns with table headers</span>
        </div>
      ) : (
        <div className="space-y-5">
          {/* File Selected Badge */}
          <div className="flex items-center justify-between bg-[#0A0B0D] border border-[#26272B] px-3.5 py-2.5 rounded-xl text-xs font-mono">
            <span className="text-zinc-200 truncate pr-4">📄 {file.name} ({(file.size/1024).toFixed(1)} KB)</span>
            <button
              onClick={resetImporter}
              className="text-rose-400 hover:text-rose-300 text-[10px] font-sans flex items-center gap-1.5"
            >
              <RefreshCw size={11} /> Change File
            </button>
          </div>

          {/* Mapping Grid Columns selector */}
          <div className="bg-[#0A0B0D] border border-[#26272B] p-4 rounded-xl">
            <h4 className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-3">
              Configure CSV Column Mappings
            </h4>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {/* Date */}
              <div>
                <label className="block text-[9px] text-zinc-500 uppercase font-mono mb-1">Date Column *</label>
                <div className="relative">
                  <select
                    value={mapping.date}
                    onChange={(e) => handleMappingChange('date', e.target.value)}
                    className="w-full bg-[#141519] border border-[#26272B] rounded-lg px-2.5 py-1.5 text-[11px] text-white focus:outline-none appearance-none"
                  >
                    <option value="">-- Select --</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2 top-2.5 text-zinc-500 pointer-events-none" size={12} />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[9px] text-zinc-500 uppercase font-mono mb-1">Description Column *</label>
                <div className="relative">
                  <select
                    value={mapping.description}
                    onChange={(e) => handleMappingChange('description', e.target.value)}
                    className="w-full bg-[#141519] border border-[#26272B] rounded-lg px-2.5 py-1.5 text-[11px] text-white focus:outline-none appearance-none"
                  >
                    <option value="">-- Select --</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2 top-2.5 text-zinc-500 pointer-events-none" size={12} />
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-[9px] text-zinc-500 uppercase font-mono mb-1">Amount Column *</label>
                <div className="relative">
                  <select
                    value={mapping.amount}
                    onChange={(e) => handleMappingChange('amount', e.target.value)}
                    className="w-full bg-[#141519] border border-[#26272B] rounded-lg px-2.5 py-1.5 text-[11px] text-white focus:outline-none appearance-none"
                  >
                    <option value="">-- Select --</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2 top-2.5 text-zinc-500 pointer-events-none" size={12} />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-[9px] text-zinc-500 uppercase font-mono mb-1">Category Column (Optional)</label>
                <div className="relative">
                  <select
                    value={mapping.category}
                    onChange={(e) => handleMappingChange('category', e.target.value)}
                    className="w-full bg-[#141519] border border-[#26272B] rounded-lg px-2.5 py-1.5 text-[11px] text-white focus:outline-none appearance-none"
                  >
                    <option value="">-- Auto Use Default --</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2 top-2.5 text-zinc-500 pointer-events-none" size={12} />
                </div>
              </div>

              {/* Inflow vs Outflow Type Column mapping */}
              <div>
                <label className="block text-[9px] text-zinc-500 uppercase font-mono mb-1">Flow Type Column (Optional)</label>
                <div className="relative">
                  <select
                    value={mapping.type}
                    onChange={(e) => handleMappingChange('type', e.target.value)}
                    className="w-full bg-[#141519] border border-[#26272B] rounded-lg px-2.5 py-1.5 text-[11px] text-white focus:outline-none appearance-none"
                  >
                    <option value="">-- Guess from +/- amount --</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2 top-2.5 text-zinc-500 pointer-events-none" size={12} />
                </div>
              </div>
            </div>
          </div>

          {/* Rows compiling Preview */}
          {previewData.length > 0 && (
            <div className="border border-[#26272B] rounded-xl overflow-hidden bg-[#0A0B0D]">
              <div className="bg-[#141519] px-4 py-2 border-b border-[#26272B] flex items-center justify-between">
                <span className="text-[10px] font-mono text-zinc-400 uppercase">Compiled Data Preview ({previewData.length} records)</span>
                <span className="text-[9px] font-semibold bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded">Ready to Import</span>
              </div>
              <div className="max-h-[140px] overflow-y-auto overflow-x-auto text-[10px] tabular-nums text-zinc-300">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-[#141519] border-b border-[#26272B] text-zinc-500 uppercase font-mono font-normal">
                      <th className="px-3 py-1.5">Date</th>
                      <th className="px-3 py-1.5">Description</th>
                      <th className="px-3 py-1.5 text-right">Amount</th>
                      <th className="px-3 py-1.5">Category</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1C1D21]">
                    {previewData.slice(0, 5).map((row, idx) => (
                      <tr key={idx} className="hover:bg-[#141519]/40">
                        <td className="px-3 py-1.5 font-mono text-zinc-400">{row.date}</td>
                        <td className="px-3 py-1.5 text-white font-medium truncate max-w-[150px]">{row.description}</td>
                        <td className={`px-3 py-1.5 text-right font-mono font-semibold ${row.amount > 0 ? 'text-[#10b981]' : 'text-rose-400'}`}>
                          {row.amount > 0 ? '+' : ''}{activeCurrencySymbol}{Math.abs(row.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-1.5 text-zinc-400 truncate max-w-[100px]">{row.category}</td>
                      </tr>
                    ))}
                    {previewData.length > 5 && (
                      <tr>
                        <td colSpan={4} className="px-3 py-1.5 text-center text-[9px] text-[#71717A] bg-[#141519]/25 font-mono italic">
                          and {previewData.length - 5} more historical ledger rows...
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Import Execute block button */}
          <button
            onClick={handleExecuteImport}
            disabled={previewData.length === 0}
            className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white font-medium text-xs px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition"
          >
            <CheckCircle2 size={14} />
            Append {previewData.length} Mapped Historical Transactions to Ledger
          </button>
        </div>
      )}
    </div>
  );
}
