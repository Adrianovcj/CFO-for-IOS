import { useState, useEffect, useRef } from "react";

const STORAGE_KEY = "cfo-data";
const CATEGORIES = {
  expense: ["Alimentação", "Transporte", "Moradia", "Saúde", "Lazer", "Educação", "Compras", "Serviços", "Pets", "Outros"],
  income: ["Salário", "Freelance", "Investimentos", "Vendas", "Outros"]
};
const CURRENCY = "R$";

function formatMoney(v) {
  return `${CURRENCY} ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getMonthKey(d) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// ─── Persistence via localStorage ───
function saveData(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch(e) { console.error(e); }
}
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// ─── AI via Anthropic API ───
// To enable: set your API key below (or use env var VITE_ANTHROPIC_API_KEY)
const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || "";

async function getAIInsight(entries, monthlyIncome, monthlyBudget, question) {
  if (!API_KEY) {
    return "⚠️ Para usar a IA, adicione sua API key da Anthropic.\n\nCrie um arquivo .env na raiz do projeto:\nVITE_ANTHROPIC_API_KEY=sk-ant-...";
  }
  const recent = entries.slice(-50);
  const summary = recent.map(e =>
    `${e.date} | ${e.type === "income" ? "+" : "-"}${e.amount} | ${e.category} | ${e.description}`
  ).join("\n");
  const totalIncome = entries.filter(e => e.type === "income").reduce((s, e) => s + e.amount, 0);
  const totalExpense = entries.filter(e => e.type === "expense").reduce((s, e) => s + e.amount, 0);

  const prompt = `You are a concise personal finance advisor. Respond in Portuguese. Be direct, warm, no fluff. Use emoji sparingly.

Monthly income target: ${formatMoney(monthlyIncome)}
Monthly budget: ${formatMoney(monthlyBudget)}
Total recorded income: ${formatMoney(totalIncome)}
Total recorded expenses: ${formatMoney(totalExpense)}
Balance: ${formatMoney(totalIncome - totalExpense)}

Recent transactions:
${summary || "(none yet)"}

${question}

Keep response under 200 words. Use short paragraphs, no bullet lists.`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }]
      })
    });
    const data = await res.json();
    if (data.error) return `Erro: ${data.error.message}`;
    return data.content?.map(b => b.text || "").join("") || "Sem resposta.";
  } catch (e) {
    return "Erro ao conectar com a IA. Verifique sua conexão.";
  }
}

// ─── Smart parse ───
function smartParse(text) {
  const match = text.match(/^(.+?)\s+([\d.,]+)\s*$/);
  if (!match) return null;
  const desc = match[1].trim();
  const amount = parseFloat(match[2].replace(/\./g, "").replace(",", "."));
  if (isNaN(amount) || amount <= 0) return null;
  const incomeWords = ["salário", "salario", "renda", "freelance", "receita", "pagamento recebido", "income", "recebido", "venda"];
  const isIncome = incomeWords.some(w => desc.toLowerCase().includes(w));
  return { description: desc, amount, type: isIncome ? "income" : "expense" };
}

// ─── Styles ───
const selectStyle = {
  flex: 1, padding: "10px 8px", background: "#0f1a0f",
  border: "1px solid #1a3a1a", borderRadius: 6, color: "#c8e6c8",
  fontFamily: "'JetBrains Mono', monospace", fontSize: 11, outline: "none",
  WebkitAppearance: "none"
};
const cardSmall = {
  flex: 1, background: "#0a1f0a", border: "1px solid #1a3a1a",
  borderRadius: 10, padding: 14
};
const labelStyle = {
  fontSize: 11, color: "#5a8a5a", letterSpacing: 1,
  fontFamily: "'Space Mono', monospace", marginBottom: 6, display: "block"
};
const inputStyle = {
  width: "100%", padding: "14px 16px", background: "#0f1a0f",
  border: "1px solid #1a3a1a", borderRadius: 8, color: "#c8e6c8",
  fontFamily: "'JetBrains Mono', monospace", fontSize: 16, outline: "none",
  boxSizing: "border-box", WebkitAppearance: "none"
};
const sectionTitle = {
  fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#4ade80",
  letterSpacing: 3, marginBottom: 20, textTransform: "uppercase"
};

// ─── Components ───

function TabBar({ tab, setTab }) {
  const tabs = [
    { id: "add", icon: "＋", label: "Adicionar" },
    { id: "dash", icon: "◉", label: "Painel" },
    { id: "history", icon: "≡", label: "Histórico" },
    { id: "ai", icon: "✦", label: "IA" },
  ];
  return (
    <div style={{
      display: "flex", borderTop: "1px solid #1a2a1a",
      background: "#0a0f0a", position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 10,
      paddingBottom: "env(safe-area-inset-bottom)"
    }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => setTab(t.id)} style={{
          flex: 1, padding: "12px 0 10px", background: "none", border: "none",
          color: tab === t.id ? "#4ade80" : "#3a5a3a", cursor: "pointer",
          fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 1,
          transition: "color .2s", WebkitTapHighlightColor: "transparent"
        }}>
          <div style={{ fontSize: 18, marginBottom: 2 }}>{t.icon}</div>
          {t.label}
        </button>
      ))}
    </div>
  );
}

function QuickAdd({ onAdd }) {
  const [raw, setRaw] = useState("");
  const [type, setType] = useState("expense");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(todayStr());
  const [feedback, setFeedback] = useState(null);
  const inputRef = useRef();

  const handleQuick = () => {
    const parsed = smartParse(raw);
    if (!parsed) { setFeedback("Formato: descrição valor (ex: Pizza 45)"); return; }
    const entry = {
      ...parsed,
      category: category || (parsed.type === "income" ? "Outros" : "Outros"),
      date, id: Date.now().toString()
    };
    onAdd(entry);
    setRaw(""); setCategory("");
    setFeedback(`✓ ${parsed.type === "income" ? "Receita" : "Despesa"}: ${parsed.description} — ${formatMoney(parsed.amount)}`);
    setTimeout(() => setFeedback(null), 3000);
    inputRef.current?.focus();
  };

  return (
    <div style={{ padding: "20px 16px" }}>
      <div style={sectionTitle}>Entrada rápida</div>
      <input ref={inputRef} value={raw} onChange={e => setRaw(e.target.value)}
        onKeyDown={e => e.key === "Enter" && handleQuick()}
        placeholder="Pizza 45 · Salário 5000 · Uber 18"
        style={{ ...inputStyle, fontSize: 15 }} />
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <select value={type} onChange={e => setType(e.target.value)} style={selectStyle}>
          <option value="expense">Despesa</option>
          <option value="income">Receita</option>
        </select>
        <select value={category} onChange={e => setCategory(e.target.value)} style={selectStyle}>
          <option value="">Auto</option>
          {CATEGORIES[type].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} style={selectStyle} />
      </div>
      <button onClick={handleQuick} style={{
        width: "100%", marginTop: 14, padding: "14px", background: "#16a34a",
        border: "none", borderRadius: 8, color: "#fff", fontFamily: "'JetBrains Mono', monospace",
        fontSize: 14, cursor: "pointer", fontWeight: 600, letterSpacing: 1
      }}>REGISTRAR</button>
      {feedback && (
        <div style={{
          marginTop: 12, padding: "10px 14px", borderRadius: 6,
          background: feedback.startsWith("✓") ? "#0a2a0a" : "#2a0a0a",
          color: feedback.startsWith("✓") ? "#4ade80" : "#f87171",
          fontFamily: "'JetBrains Mono', monospace", fontSize: 12
        }}>{feedback}</div>
      )}
    </div>
  );
}

function Dashboard({ entries, monthlyIncome, monthlyBudget }) {
  const now = new Date();
  const mk = getMonthKey(todayStr());
  const monthEntries = entries.filter(e => getMonthKey(e.date) === mk);
  const totalIncome = monthEntries.filter(e => e.type === "income").reduce((s, e) => s + e.amount, 0);
  const totalExpense = monthEntries.filter(e => e.type === "expense").reduce((s, e) => s + e.amount, 0);
  const balance = totalIncome - totalExpense;
  const budgetUsed = monthlyBudget > 0 ? (totalExpense / monthlyBudget) * 100 : 0;
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const dailyBudget = monthlyBudget > 0 ? (monthlyBudget - totalExpense) / Math.max(1, daysInMonth - dayOfMonth + 1) : 0;
  const catTotals = {};
  monthEntries.filter(e => e.type === "expense").forEach(e => {
    catTotals[e.category] = (catTotals[e.category] || 0) + e.amount;
  });
  const sortedCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
  const maxCat = sortedCats.length > 0 ? sortedCats[0][1] : 1;

  return (
    <div style={{ padding: "20px 16px" }}>
      <div style={sectionTitle}>
        Painel · {now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
      </div>
      <div style={{
        background: "linear-gradient(135deg, #0a1f0a 0%, #0f2a0f 100%)",
        border: "1px solid #1a3a1a", borderRadius: 12, padding: 20, marginBottom: 16
      }}>
        <div style={{ fontSize: 11, color: "#5a8a5a", letterSpacing: 2, fontFamily: "'Space Mono', monospace" }}>SALDO DO MÊS</div>
        <div style={{
          fontSize: 32, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
          color: balance >= 0 ? "#4ade80" : "#f87171", marginTop: 6
        }}>{formatMoney(balance)}</div>
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <div style={cardSmall}>
          <div style={{ fontSize: 10, color: "#5a8a5a", letterSpacing: 1 }}>RECEITAS</div>
          <div style={{ fontSize: 18, color: "#4ade80", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, marginTop: 4 }}>{formatMoney(totalIncome)}</div>
        </div>
        <div style={cardSmall}>
          <div style={{ fontSize: 10, color: "#5a8a5a", letterSpacing: 1 }}>DESPESAS</div>
          <div style={{ fontSize: 18, color: "#f87171", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, marginTop: 4 }}>{formatMoney(totalExpense)}</div>
        </div>
      </div>
      <div style={{ background: "#0a1f0a", border: "1px solid #1a3a1a", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 10, color: "#5a8a5a", letterSpacing: 1 }}>ORÇAMENTO USADO</span>
          <span style={{
            fontSize: 12, fontFamily: "'JetBrains Mono', monospace",
            color: budgetUsed > 90 ? "#f87171" : budgetUsed > 70 ? "#fbbf24" : "#4ade80"
          }}>{budgetUsed.toFixed(1)}%</span>
        </div>
        <div style={{ height: 8, background: "#1a2a1a", borderRadius: 4, overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 4, transition: "width .6s ease",
            width: `${Math.min(100, budgetUsed)}%`,
            background: budgetUsed > 90 ? "#f87171" : budgetUsed > 70 ? "#fbbf24" : "#4ade80"
          }} />
        </div>
        <div style={{ fontSize: 11, color: "#5a8a5a", marginTop: 8, fontFamily: "'JetBrains Mono', monospace" }}>
          Diário disponível: <span style={{ color: dailyBudget > 0 ? "#4ade80" : "#f87171" }}>{formatMoney(Math.max(0, dailyBudget))}</span>
        </div>
      </div>
      {sortedCats.length > 0 && (
        <div style={{ background: "#0a1f0a", border: "1px solid #1a3a1a", borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 10, color: "#5a8a5a", letterSpacing: 1, marginBottom: 12 }}>CATEGORIAS</div>
          {sortedCats.slice(0, 6).map(([cat, total]) => (
            <div key={cat} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: "#c8e6c8" }}>{cat}</span>
                <span style={{ fontSize: 12, color: "#4ade80", fontFamily: "'JetBrains Mono', monospace" }}>{formatMoney(total)}</span>
              </div>
              <div style={{ height: 4, background: "#1a2a1a", borderRadius: 2 }}>
                <div style={{ height: "100%", borderRadius: 2, background: "#16a34a", width: `${(total / maxCat) * 100}%`, transition: "width .4s" }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function History({ entries, onDelete }) {
  const [filter, setFilter] = useState("all");
  const filtered = entries.filter(e => filter === "all" || e.type === filter).slice().reverse();

  return (
    <div style={{ padding: "20px 16px" }}>
      <div style={sectionTitle}>Histórico</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {[["all", "Tudo"], ["expense", "Despesas"], ["income", "Receitas"]].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)} style={{
            padding: "6px 14px", borderRadius: 6, border: "1px solid #1a3a1a",
            background: filter === v ? "#16a34a" : "transparent",
            color: filter === v ? "#fff" : "#5a8a5a", cursor: "pointer",
            fontFamily: "'JetBrains Mono', monospace", fontSize: 11
          }}>{l}</button>
        ))}
      </div>
      {filtered.length === 0 && (
        <div style={{ color: "#3a5a3a", textAlign: "center", padding: 40, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>
          Nenhuma entrada ainda
        </div>
      )}
      {filtered.map(e => (
        <div key={e.id} style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 14px", background: "#0a1f0a", border: "1px solid #1a3a1a",
          borderRadius: 8, marginBottom: 8
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, color: "#c8e6c8", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.description}</div>
            <div style={{ fontSize: 10, color: "#3a5a3a", fontFamily: "'JetBrains Mono', monospace" }}>{e.date} · {e.category}</div>
          </div>
          <div style={{
            fontSize: 15, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600,
            color: e.type === "income" ? "#4ade80" : "#f87171", marginRight: 10, whiteSpace: "nowrap"
          }}>{e.type === "income" ? "+" : "−"}{formatMoney(e.amount)}</div>
          <button onClick={() => onDelete(e.id)} style={{
            background: "none", border: "none", color: "#3a3a3a", cursor: "pointer",
            fontSize: 18, padding: "4px 8px", WebkitTapHighlightColor: "transparent"
          }}>×</button>
        </div>
      ))}
    </div>
  );
}

function AIPanel({ entries, monthlyIncome, monthlyBudget }) {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [customQ, setCustomQ] = useState("");

  const ask = async (question) => {
    setLoading(true); setResponse(null);
    const r = await getAIInsight(entries, monthlyIncome, monthlyBudget, question);
    setResponse(r); setLoading(false);
  };

  const presets = [
    { label: "Relatório de hoje", q: "Gere um relatório financeiro rápido do dia de hoje. Inclua gastos, saldo, e um conselho." },
    { label: "Análise do mês", q: "Analise meus gastos deste mês. Onde estou gastando demais? O que posso cortar? Dê uma nota de 0-100." },
    { label: "Previsão", q: "Com base nos meus padrões de gasto, preveja como vou terminar o mês. Vou ter déficit ou sobra?" },
    { label: "Dica de economia", q: "Me dê 2-3 dicas práticas e específicas para economizar com base nos meus dados reais de gastos." },
  ];

  return (
    <div style={{ padding: "20px 16px" }}>
      <div style={sectionTitle}>Consultar IA ✦</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        {presets.map((p, i) => (
          <button key={i} onClick={() => ask(p.q)} disabled={loading} style={{
            padding: "12px 16px", background: "#0a1f0a", border: "1px solid #1a3a1a",
            borderRadius: 8, color: "#c8e6c8", cursor: loading ? "wait" : "pointer",
            fontFamily: "'JetBrains Mono', monospace", fontSize: 12, textAlign: "left"
          }}>{p.label}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={customQ} onChange={e => setCustomQ(e.target.value)}
          onKeyDown={e => e.key === "Enter" && customQ.trim() && ask(customQ)}
          placeholder="Pergunta livre..."
          style={{ flex: 1, padding: "12px 14px", background: "#0f1a0f", border: "1px solid #1a3a1a", borderRadius: 8, color: "#c8e6c8", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, outline: "none" }} />
        <button onClick={() => customQ.trim() && ask(customQ)} disabled={loading} style={{
          padding: "12px 16px", background: "#16a34a", border: "none", borderRadius: 8,
          color: "#fff", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", fontSize: 13
        }}>→</button>
      </div>
      {loading && (
        <div style={{ marginTop: 20, textAlign: "center", color: "#4ade80", fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
          <div className="pulse-anim">Analisando seus dados...</div>
        </div>
      )}
      {response && (
        <div style={{
          marginTop: 16, padding: 16, background: "#0a1f0a", border: "1px solid #1a3a1a",
          borderRadius: 10, color: "#c8e6c8", fontFamily: "'JetBrains Mono', monospace",
          fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap"
        }}>{response}</div>
      )}
    </div>
  );
}

function Settings({ monthlyIncome, monthlyBudget, onUpdate, onExport, onReset }) {
  const [income, setIncome] = useState(monthlyIncome);
  const [budget, setBudget] = useState(monthlyBudget);

  return (
    <div style={{ padding: "20px 16px" }}>
      <div style={sectionTitle}>Configurações</div>
      <label style={labelStyle}>Renda mensal</label>
      <input type="number" value={income} onChange={e => setIncome(Number(e.target.value))} style={inputStyle} />
      <label style={{ ...labelStyle, marginTop: 16 }}>Orçamento mensal</label>
      <input type="number" value={budget} onChange={e => setBudget(Number(e.target.value))} style={inputStyle} />
      <button onClick={() => onUpdate(income, budget)} style={{
        width: "100%", marginTop: 16, padding: 14, background: "#16a34a", border: "none",
        borderRadius: 8, color: "#fff", fontFamily: "'JetBrains Mono', monospace", fontSize: 14, cursor: "pointer"
      }}>Salvar</button>
      <button onClick={onExport} style={{
        width: "100%", marginTop: 10, padding: 14, background: "transparent", border: "1px solid #1a3a1a",
        borderRadius: 8, color: "#5a8a5a", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, cursor: "pointer"
      }}>Exportar CSV</button>
      <button onClick={onReset} style={{
        width: "100%", marginTop: 10, padding: 14, background: "transparent", border: "1px solid #3a1a1a",
        borderRadius: 8, color: "#f87171", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, cursor: "pointer"
      }}>Resetar tudo</button>
    </div>
  );
}

function Setup({ onComplete }) {
  const [income, setIncome] = useState("");
  const [budget, setBudget] = useState("");

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      justifyContent: "center", padding: "40px 24px", background: "#060d06"
    }}>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: "#4ade80", letterSpacing: 4, marginBottom: 8, textTransform: "uppercase" }}>CFO Pessoal</div>
      <div style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 28, color: "#e8f5e8", lineHeight: 1.3, marginBottom: 32 }}>
        Configure seu<br />controle financeiro.
      </div>
      <label style={labelStyle}>Renda mensal</label>
      <input type="number" value={income} onChange={e => setIncome(e.target.value)} placeholder="5000" style={inputStyle} />
      <label style={{ ...labelStyle, marginTop: 16 }}>Orçamento mensal (meta de gastos)</label>
      <input type="number" value={budget} onChange={e => setBudget(e.target.value)} placeholder="3500" style={inputStyle} />
      <button onClick={() => { if (income && budget) onComplete(Number(income), Number(budget)); }} style={{
        marginTop: 24, padding: 16, background: "#16a34a", border: "none", borderRadius: 10,
        color: "#fff", fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 600, cursor: "pointer", letterSpacing: 1
      }}>INICIAR</button>
    </div>
  );
}

// ─── Main App ───
export default function App() {
  const [ready, setReady] = useState(false);
  const [entries, setEntries] = useState([]);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlyBudget, setMonthlyBudget] = useState(0);
  const [tab, setTab] = useState("add");

  useEffect(() => {
    const data = loadData();
    if (data) {
      setEntries(data.entries || []);
      setMonthlyIncome(data.monthlyIncome || 0);
      setMonthlyBudget(data.monthlyBudget || 0);
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (ready) saveData({ entries, monthlyIncome, monthlyBudget });
  }, [entries, monthlyIncome, monthlyBudget, ready]);

  const addEntry = (entry) => setEntries(prev => [...prev, entry]);
  const deleteEntry = (id) => setEntries(prev => prev.filter(e => e.id !== id));

  const handleExport = () => {
    const csv = "Data,Tipo,Categoria,Descrição,Valor\n" +
      entries.map(e => `${e.date},${e.type},${e.category},"${e.description}",${e.amount}`).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `cfo-pessoal-${todayStr()}.csv`;
    a.click();
  };

  const handleReset = () => {
    if (confirm("Tem certeza? Todos os dados serão apagados.")) {
      localStorage.removeItem(STORAGE_KEY);
      setEntries([]); setReady(false);
    }
  };

  if (!ready) return <Setup onComplete={(i, b) => { setMonthlyIncome(i); setMonthlyBudget(b); setReady(true); }} />;

  return (
    <div style={{ minHeight: "100vh", background: "#060d06", color: "#c8e6c8", fontFamily: "'JetBrains Mono', monospace", display: "flex", flexDirection: "column" }}>
      <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif&family=JetBrains+Mono:wght@400;600;700&family=Space+Mono&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:1} }
        .pulse-anim { animation: pulse 1.5s infinite; }
        input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.5); }
      `}</style>

      <div style={{
        padding: "16px", borderBottom: "1px solid #1a2a1a",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        paddingTop: "calc(16px + env(safe-area-inset-top))"
      }}>
        <span style={{ fontSize: 10, color: "#4ade80", letterSpacing: 3, fontFamily: "'Space Mono', monospace" }}>CFO PESSOAL</span>
        <button onClick={() => setTab(tab === "settings" ? "add" : "settings")} style={{
          background: "none", border: "none", color: tab === "settings" ? "#4ade80" : "#3a5a3a",
          fontSize: 18, cursor: "pointer", padding: "4px 8px"
        }}>⚙</button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 90 }}>
        {tab === "add" && <QuickAdd onAdd={addEntry} />}
        {tab === "dash" && <Dashboard entries={entries} monthlyIncome={monthlyIncome} monthlyBudget={monthlyBudget} />}
        {tab === "history" && <History entries={entries} onDelete={deleteEntry} />}
        {tab === "ai" && <AIPanel entries={entries} monthlyIncome={monthlyIncome} monthlyBudget={monthlyBudget} />}
        {tab === "settings" && <Settings monthlyIncome={monthlyIncome} monthlyBudget={monthlyBudget}
          onUpdate={(i, b) => { setMonthlyIncome(i); setMonthlyBudget(b); setTab("dash"); }}
          onExport={handleExport} onReset={handleReset} />}
      </div>

      <TabBar tab={tab} setTab={setTab} />
    </div>
  );
}
