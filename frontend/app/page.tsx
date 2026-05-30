"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { Battery, Thermometer, Zap, Clock, Send, Cpu, Activity, AlertTriangle, Calendar } from 'lucide-react';
import axios from 'axios';
import { 
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis 
} from 'recharts';
export default function VoltGuardDashboard() {
  const [inputs, setInputs] = useState({
    current_soh: 96.0,
    sim_years: 5,
    avg_temp_c: 35.0,
    fast_charge_freq: 0.8
  });

  const [graphData, setGraphData] = useState<any[]>([]);
  const [chatQuestion, setChatQuestion] = useState("");
  const [chatResponse, setChatResponse] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchGraph = async () => {
      try {
        const res = await axios.post('http://127.0.0.1:8000/graph/degradation-curve', inputs);
        setGraphData(res.data.trajectory);
      } catch (error) {
        console.error("Failed to fetch graph", error);
      }
    };
    fetchGraph();
  }, [inputs]);

  const handleChat = async () => {
    if (!chatQuestion) return;
    setLoading(true);
    try {
      const payload = { ...inputs, question: chatQuestion };
      const res = await axios.post('http://127.0.0.1:8000/chat', payload);
      setChatResponse(res.data.generative_response);
    } catch (error) {
      setChatResponse("⚠️ AI Engine is offline or unreachable.");
    }
    setLoading(false);
  };

  // --- DERIVED METRICS FOR THE NEW UI ---
  
  // 1. Calculate End of Life (Months until SoH hits 80%)
  const eolData = useMemo(() => {
    const eolPoint = graphData.find(d => d.soh_pct <= 80);
    return eolPoint ? `${eolPoint.estimated_months} Months` : "Beyond Simulation";
  }, [graphData]);

  // 2. Final Health
  const finalHealth = graphData.length > 0 ? graphData[graphData.length - 1].soh_pct : inputs.current_soh;

  // 3. Radar Chart Data (Visualizing the stress factors)
  const radarData = [
    { subject: 'Thermal Stress', A: Math.max(0, (inputs.avg_temp_c / 50) * 100) },
    { subject: 'Charging Stress', A: inputs.fast_charge_freq * 100 },
    { subject: 'Age Decay', A: (inputs.sim_years / 15) * 100 },
    { subject: 'Prior Wear', A: 100 - inputs.current_soh },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 lg:p-10 font-sans selection:bg-indigo-100">
      
      {/* Header */}
      <header className="flex items-center justify-between mb-8 max-w-[1400px] mx-auto">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200">
            <Cpu className="text-white w-7 h-7" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            VoltGuard <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500">Platform</span>
          </h1>
        </div>
        <div className="px-4 py-2 bg-emerald-50 text-emerald-700 text-sm font-bold rounded-full border border-emerald-200 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          AI Engine Online
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto space-y-6">
        
        {/* KPI ROW (The Executive Summary) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-lg text-blue-600"><Activity className="w-6 h-6"/></div>
            <div>
              <p className="text-sm font-semibold text-slate-500">Final Projected Health</p>
              <h3 className="text-2xl font-bold text-slate-800">{finalHealth}%</h3>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-rose-50 rounded-lg text-rose-600"><AlertTriangle className="w-6 h-6"/></div>
            <div>
              <p className="text-sm font-semibold text-slate-500">Est. Time to End-of-Life (80%)</p>
              <h3 className="text-2xl font-bold text-slate-800">{eolData}</h3>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-amber-50 rounded-lg text-amber-600"><Calendar className="w-6 h-6"/></div>
            <div>
              <p className="text-sm font-semibold text-slate-500">Simulation Horizon</p>
              <h3 className="text-2xl font-bold text-slate-800">{inputs.sim_years} Years</h3>
            </div>
          </div>
        </div>

        {/* MAIN BENTO GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Controls (Left Col) */}
          <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <h2 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Clock className="text-indigo-500 w-5 h-5" /> Test Parameters
            </h2>
            <div className="space-y-8">
              <div>
                <label className="flex justify-between text-sm font-bold text-slate-600 mb-2">
                  <span>Initial SoH</span><span className="text-indigo-600">{inputs.current_soh}%</span>
                </label>
                <input type="range" min="50" max="100" step="0.5" value={inputs.current_soh} onChange={(e) => setInputs({...inputs, current_soh: parseFloat(e.target.value)})} className="w-full accent-indigo-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer" />
              </div>
              <div>
                <label className="flex justify-between text-sm font-bold text-slate-600 mb-2">
                  <span>Simulated Years</span><span className="text-indigo-600">{inputs.sim_years} Yrs</span>
                </label>
                <input type="range" min="1" max="15" step="1" value={inputs.sim_years} onChange={(e) => setInputs({...inputs, sim_years: parseInt(e.target.value)})} className="w-full accent-indigo-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer" />
              </div>
              <div>
                <label className="flex justify-between text-sm font-bold text-slate-600 mb-2">
                  <span>Avg Climate Temp</span><span className="text-indigo-600">{inputs.avg_temp_c}°C</span>
                </label>
                <input type="range" min="-10" max="50" step="1" value={inputs.avg_temp_c} onChange={(e) => setInputs({...inputs, avg_temp_c: parseFloat(e.target.value)})} className="w-full accent-indigo-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer" />
              </div>
              <div>
                <label className="flex justify-between text-sm font-bold text-slate-600 mb-2">
                  <span>Fast Charge Ratio</span><span className="text-indigo-600">{Math.round(inputs.fast_charge_freq * 100)}%</span>
                </label>
                <input type="range" min="0" max="1" step="0.1" value={inputs.fast_charge_freq} onChange={(e) => setInputs({...inputs, fast_charge_freq: parseFloat(e.target.value)})} className="w-full accent-indigo-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer" />
              </div>
            </div>
          </div>

          {/* Line Graph (Middle Col) */}
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-[420px]">
            <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Battery className="text-indigo-500 w-5 h-5" /> Degradation Trajectory
            </h2>
            <ResponsiveContainer width="100%" height="90%">
              <ComposedChart data={graphData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="estimated_months" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(t) => `${t}m`} />
                <YAxis domain={['auto', 100]} stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(t) => `${t}%`} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                
                {/* The Uncertainty Bounds (Dashed Lines) */}
                <Line type="monotone" dataKey="best_case" name="Best Case" stroke="#a5b4fc" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                <Line type="monotone" dataKey="worst_case" name="Worst Case" stroke="#fca5a5" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                
                {/* The Main Prediction Line */}
                <Line type="monotone" dataKey="soh_pct" name="Expected Health" stroke="#4f46e5" strokeWidth={4} dot={false} activeDot={{ r: 8, fill: '#4f46e5', stroke: '#fff', strokeWidth: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Radar Chart (Right Col) */}
          <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-[420px]">
            <h2 className="text-base font-bold text-slate-800 mb-2 flex items-center gap-2">
              <Zap className="text-indigo-500 w-5 h-5" /> Stress Factor Analysis
            </h2>
            <ResponsiveContainer width="100%" height="90%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="Stress" dataKey="A" stroke="#4f46e5" fill="#6366f1" fillOpacity={0.4} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* AI Chat Area (Bottom full width) */}
          <div className="lg:col-span-12 bg-white border border-slate-200 rounded-2xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Send className="text-indigo-500 w-5 h-5" /> VoltGuard LLM Consultant
            </h2>
            <div className="flex gap-4">
              <input 
                type="text" 
                placeholder="Ask the AI for a strategic breakdown of this simulation..." 
                value={chatQuestion}
                onChange={(e) => setChatQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleChat()}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-slate-700 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-lg"
              />
              <button 
                onClick={handleChat}
                disabled={loading}
                className="bg-slate-900 hover:bg-indigo-600 disabled:bg-slate-300 text-white px-8 py-4 rounded-xl font-bold transition-all flex items-center gap-2"
              >
                {loading ? "Analyzing Matrix..." : "Consult AI"}
              </button>
            </div>
            
            {chatResponse && (
              <div className="mt-6 p-6 bg-indigo-50 border-l-4 border-indigo-500 rounded-r-xl">
                <p className="text-slate-800 leading-relaxed whitespace-pre-line font-medium text-base">
                  {chatResponse}
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}