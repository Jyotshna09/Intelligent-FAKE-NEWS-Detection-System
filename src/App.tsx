import { useState, useMemo } from 'react';
import {
  Shield,
  Cpu,
  Layers,
  Search,
  Sparkles,
  Copy,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  X,
  FileDown,
  ArrowRight,
  ExternalLink,
  BookOpen,
  RefreshCw
} from 'lucide-react';
import { analyzePatterns, runKmp, runRabinKarp } from './algorithms';
import { FactCheckReport } from './types';

const TEXT_PRESETS = [
  {
    title: 'Republic Day Hype',
    text: 'June 12 is Republic Day in India. Share immediately!',
  },
  {
    title: 'Political Claim',
    text: 'Tamil Nadu CM is Vijay.',
  },
  {
    title: 'Political Prediction',
    text: 'Vijay may become Tamil Nadu CM.',
  },
  {
    title: 'Science Claim',
    text: 'Scientists discovered magical water that cures cancer instantly. Doctors shock!',
  },
  {
    title: 'Urgency Broadcast',
    text: 'Warning! Secret government leak reveals the water supply has hidden elements to control minds. Forward now to save lives!',
  }
];

const DEFAULT_PATTERNS = [
  'share immediately',
  'forward now',
  'cures cancer',
  'magical water',
  'republic day',
  'secret government leak',
  'vijay',
  'instantly',
  'shock'
];

export default function App() {
  const [inputText, setInputText] = useState(TEXT_PRESETS[0].text);
  const [patterns, setPatterns] = useState<string[]>(DEFAULT_PATTERNS);
  const [newPattern, setNewPattern] = useState('');
  const [selectedPattern, setSelectedPattern] = useState(DEFAULT_PATTERNS[0]);
  const [activeTab, setActiveTab] = useState<'analyze' | 'algorithms' | 'patterns_lib'>('analyze');
  const [algoTab, setAlgoTab] = useState<'kmp' | 'rk'>('kmp');
  
  // AI states
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<FactCheckReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Synchronous algorithm results
  const algoResults = useMemo(() => {
    return analyzePatterns(inputText, patterns);
  }, [inputText, patterns]);

  const selectedKmp = useMemo(() => {
    return runKmp(inputText, selectedPattern);
  }, [inputText, selectedPattern]);

  const selectedRk = useMemo(() => {
    return runRabinKarp(inputText, selectedPattern);
  }, [inputText, selectedPattern]);

  const handleAddPattern = () => {
    const trimmed = newPattern.trim().toLowerCase();
    if (trimmed && !patterns.includes(trimmed)) {
      setPatterns([...patterns, trimmed]);
      setSelectedPattern(trimmed);
      setNewPattern('');
    }
  };

  const handleRemovePattern = (patternToRemove: string) => {
    const nextPatterns = patterns.filter(p => p !== patternToRemove);
    setPatterns(nextPatterns);
    if (selectedPattern === patternToRemove && nextPatterns.length > 0) {
      setSelectedPattern(nextPatterns[0]);
    }
  };

  const handleAiVerification = async () => {
    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: inputText })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server returned error code ${response.status}`);
      }

      const data = await response.json();
      setAnalysisResult(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while calling the factual verification layer.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyRequiredReport = () => {
    if (!analysisResult) return;
    navigator.clipboard.writeText(analysisResult.rawOutput);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const getRiskLabel = (score: number) => {
    if (score <= 30) return { text: 'Low risk match', color: 'text-emerald-700 bg-emerald-50 border-emerald-100' };
    if (score <= 60) return { text: 'Moderate risk match', color: 'text-amber-700 bg-amber-50 border-amber-100' };
    return { text: 'High risk match', color: 'text-red-700 bg-red-50 border-red-100' };
  };

  const getBadgeStyle = (classification: string) => {
    switch (classification) {
      case 'True':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'False':
        return 'bg-red-50 text-red-800 border-red-200';
      case 'Suspicious':
      case 'Potential Misinformation':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Opinion':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      default:
        return 'bg-stone-50 text-stone-800 border-stone-200';
    }
  };

  const renderHighlightedContent = () => {
    if (!inputText) return <span className="text-stone-400 italic">Please enter some text below.</span>;

    const sortedHighlights = [...algoResults.combinedMatches].sort((a, b) => a.index - b.index);
    const elements: any[] = [];
    let lastIndex = 0;

    sortedHighlights.forEach((match, idx) => {
      if (match.index < lastIndex) return;

      if (match.index > lastIndex) {
        elements.push(<span key={`text-pre-${idx}`}>{inputText.substring(lastIndex, match.index)}</span>);
      }

      const phrase = inputText.substring(match.index, match.index + match.length);
      elements.push(
        <span
          key={`highlight-${idx}`}
          className="relative inline-block px-1 bg-indigo-50 border-b-2 border-indigo-500 text-indigo-900 group cursor-help font-medium rounded-sm"
        >
          {phrase}
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-stone-900 text-white text-[10px] py-1 px-2.5 rounded shadow-lg border border-stone-800 whitespace-nowrap z-50 font-mono tracking-wide">
            {match.pattern} ({match.algo})
          </span>
        </span>
      );

      lastIndex = match.index + match.length;
    });

    if (lastIndex < inputText.length) {
      elements.push(<span key="text-post">{inputText.substring(lastIndex)}</span>);
    }

    return elements;
  };

  return (
    <div className="min-h-screen bg-[#fafaf9] text-stone-900 flex flex-col font-sans" id="applet-root">
      
      {/* Premium Minimal Navigation Header */}
      <header className="border-b border-stone-200/80 bg-white/85 backdrop-blur-md px-6 py-4 sticky top-0 z-50" id="app-header">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          
          <div className="flex items-center gap-2.5">
            <div className="bg-stone-900 text-white p-2 rounded-lg">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-stone-900">
                Misinformation Audit Platform
              </h1>
              <p className="text-xs text-stone-500 font-medium">
                Academic Framework for Pattern Verification
              </p>
            </div>
          </div>
          
          {/* Navigation Control Area */}
          <nav className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg border border-stone-200/50" id="main-nav-tabs">
            <button
              id="nav-btn-analyze"
              onClick={() => setActiveTab('analyze')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-semibold tracking-wide uppercase transition-all ${
                activeTab === 'analyze'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-500 hover:text-stone-950'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              Analyzer
            </button>
            <button
              id="nav-btn-visualizer"
              onClick={() => setActiveTab('algorithms')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-semibold tracking-wide uppercase transition-all ${
                activeTab === 'algorithms'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-500 hover:text-stone-950'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-stone-600" />
              Algorithm Tracer
            </button>
            <button
              id="nav-btn-patterns"
              onClick={() => setActiveTab('patterns_lib')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-semibold tracking-wide uppercase transition-all ${
                activeTab === 'patterns_lib'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-500 hover:text-stone-950'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-stone-600" />
              Patterns Library ({patterns.length})
            </button>
          </nav>

        </div>
      </header>

      {/* Main Workspace Frame */}
      <main className="flex-grow w-full max-w-6xl mx-auto p-4 md:p-8 flex flex-col gap-8" id="app-main-view">
        
        {/* Active Analysis Mode */}
        {activeTab === 'analyze' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in" id="analyze-section-grid">
            
            {/* Input & Instant matches column */}
            <div className="lg:col-span-5 flex flex-col gap-6" id="input-column">
              
              {/* Claims Workspace */}
              <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm space-y-4" id="input-card">
                <div className="flex justify-between items-center border-b border-stone-150 pb-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-stone-400" />
                    Input Claim Paragraph
                  </h2>
                  <span className="text-xs text-stone-400 font-mono">
                    {inputText.length} characters
                  </span>
                </div>
                
                <textarea
                  id="source-text-input"
                  rows={5}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Insert the statement, speech, or claim you wish to evaluate..."
                  className="w-full text-stone-800 bg-[#fbfbfb] rounded-lg p-3 text-sm border border-stone-200 focus:border-stone-400 outline-none resize-none placeholder-stone-400 transition-all font-sans leading-relaxed shadow-inner"
                />

                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 self-center">Presets:</span>
                  {TEXT_PRESETS.map((preset, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setInputText(preset.text);
                        setAnalysisResult(null);
                      }}
                      className="text-[10px] px-2.5 py-1 bg-stone-50 border border-stone-200 text-stone-600 rounded hover:bg-stone-100 hover:text-stone-900 transition-all font-medium"
                    >
                      {preset.title}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2 justify-end pt-2 border-t border-stone-100">
                  <button
                    id="btn-clear-input"
                    onClick={() => {
                      setInputText('');
                      setAnalysisResult(null);
                    }}
                    className="px-3 py-1.5 text-xs text-stone-500 hover:text-stone-900 hover:bg-stone-50 border border-stone-200 rounded-lg font-medium transition-all"
                  >
                    Clear Text
                  </button>
                  <button
                    id="btn-run-analysis"
                    onClick={handleAiVerification}
                    disabled={isLoading || !inputText.trim()}
                    className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4.5 py-1.5 text-xs font-bold uppercase tracking-wider bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all shadow-sm hover:shadow-indigo-500/10 disabled:opacity-40"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        Running Analysis
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3" />
                        Verify Content
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Instant Match Indicators */}
              <div className="bg-white border border-stone-205 rounded-xl p-5 shadow-sm space-y-4" id="matches-indicator-container">
                <div className="flex justify-between items-center border-b border-stone-150 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-stone-400" />
                    Lexical Hit Index
                  </h3>
                  <span className="text-[11px] font-mono text-indigo-600 font-bold">
                    [ {algoResults.combinedMatches.length} Matches Found ]
                  </span>
                </div>

                <div className="bg-stone-50 rounded-lg p-4 text-sm leading-relaxed text-stone-800 border border-stone-200">
                  {renderHighlightedContent()}
                </div>

                <div className="grid grid-cols-2 gap-3 mt-1">
                  <div className="bg-stone-50/50 p-2.5 rounded-lg border border-stone-200/60 flex flex-col justify-between">
                    <span className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider">KMP Matches</span>
                    <span className="text-lg font-bold text-stone-900 font-mono">
                      {algoResults.kmp.reduce((acc, cr) => acc + cr.matches.length, 0)}
                    </span>
                  </div>
                  <div className="bg-stone-50/50 p-2.5 rounded-lg border border-stone-200/60 flex flex-col justify-between">
                    <span className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider">Rabin-Karp Hashes</span>
                    <span className="text-lg font-bold text-stone-900 font-mono">
                      {algoResults.rabinKarp.reduce((acc, cr) => acc + cr.matches.length, 0)}
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* Verification Results Column */}
            <div className="lg:col-span-7 flex flex-col gap-6" id="analysis-column">
              
              {!analysisResult && !isLoading && !error && (
                <div className="border border-stone-200/80 bg-white rounded-xl p-12 flex flex-col items-center justify-center text-center gap-4 h-full min-h-[300px]" id="empty-state-container">
                  <div className="border border-stone-200 p-3.5 bg-stone-50 rounded-xl">
                    <Shield className="w-8 h-8 text-stone-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-stone-800 uppercase tracking-wider">Awaiting Audit Execution</h3>
                    <p className="text-xs text-stone-500 max-w-sm mt-1 leading-relaxed">
                      Select a preset above or input a custom statement on the left, then trigger factual audit check.
                    </p>
                  </div>
                  <button
                    onClick={handleAiVerification}
                    className="mt-2 text-xs font-bold text-indigo-600 hover:text-indigo-500 flex items-center gap-1.5"
                  >
                    Analyze Active Claim Preset <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {isLoading && (
                <div className="border border-stone-200 bg-white rounded-xl p-12 flex flex-col items-center justify-center text-center gap-5 h-full min-h-[300px]" id="loading-container">
                  <div className="w-10 h-10 border-2 border-stone-200 border-t-stone-800 rounded-full animate-spin"></div>
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800">Processing Fact Matches</h3>
                    <p className="text-xs text-stone-500 max-w-sm leading-relaxed">
                      Auditing pattern sequences and executing server-side Gemini 3.5 content evaluation...
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <div className="border border-red-200 bg-red-50/20 rounded-xl p-6 flex flex-col gap-4 h-full justify-center" id="error-container">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <h3 className="font-bold text-xs uppercase tracking-wider">Factual Audit Exception</h3>
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed bg-white border border-red-100 p-3 rounded font-mono">
                    {error}
                  </p>
                  <button
                    onClick={handleAiVerification}
                    className="self-start px-4.5 py-1.5 text-xs font-bold bg-stone-900 hover:bg-stone-800 text-white rounded-lg transition-all"
                  >
                    Retry Analysis
                  </button>
                </div>
              )}

              {analysisResult && (
                <div className="flex flex-col gap-6" id="results-panel">
                  {analysisResult.isOfflineFallback && (
                    <div className="bg-amber-50 text-amber-800 text-xs px-4.5 py-3.5 rounded-xl border border-amber-200/80 shadow-sm flex items-start gap-2.5 animate-fade-in" id="offline-fallback-warning">
                      <AlertCircle className="w-4 h-4 text-amber-650 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold uppercase tracking-wider text-[10px] text-amber-900 mb-0.5">High-Availability Mode Active</p>
                        <p className="leading-relaxed text-[11px] text-stone-600">
                          Due to highly elevated remote cloud loads (Gemini 503 load spike), this report has been safely generated via our intelligent local pattern-matching dictionary, rendering instantly to safeguard continuous academic audits.
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* Executive Header Banner */}
                  <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm space-y-4" id="executive-summary-banner">
                    
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-stone-100 pb-4 gap-4">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">Audit Assessment</span>
                        <h2 className="text-2xl font-extrabold tracking-tight text-stone-900">
                          {analysisResult.classification}
                        </h2>
                      </div>
                      
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-0.5">Confidence Evaluation</span>
                        <div className="flex items-center sm:justify-end gap-2">
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${getRiskLabel(analysisResult.riskScore).color}`}>
                            {getRiskLabel(analysisResult.riskScore).text}
                          </span>
                          <span className="text-xl font-bold font-mono tracking-tight">{analysisResult.riskScore}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 block mb-1.5">Identified Markers</span>
                        <div className="flex flex-wrap gap-1.5">
                          {analysisResult.detectedIndicators.map((it, i) => (
                            <span key={i} className="px-2 py-0.5 bg-stone-100 text-stone-700 border border-stone-200 rounded text-[10px] font-mono">
                              {it}
                            </span>
                          ))}
                          {analysisResult.detectedIndicators.length === 0 && (
                            <span className="text-stone-400 italic">No flags matches.</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 block mb-1.5">Tone Profile</span>
                        <span className="text-sm font-semibold text-stone-800 italic underline decoration-indigo-400/30 decoration-2">
                          {analysisResult.toneAnalysis}
                        </span>
                      </div>
                    </div>

                  </div>

                  {/* Fact-Checked Information Layer */}
                  {(analysisResult.factVerification === 'FALSE' || analysisResult.correctInformation) && (
                    <div className="bg-stone-900 text-white rounded-xl p-5 border border-stone-850 space-y-3" id="fact-correction-panel">
                      <div className="flex items-center gap-2 text-indigo-400">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Corrected Fact Information</span>
                      </div>
                      <p className="text-sm leading-relaxed text-stone-100 font-serif italic pl-1">
                        {analysisResult.correctInformation}
                      </p>
                    </div>
                  )}

                  {/* Explainability Engine Context Block */}
                  <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm space-y-4" id="explainability-block">
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1.5">Context Contextual Analysis</h4>
                      <p className="text-xs text-stone-600 leading-relaxed font-sans bg-stone-50 p-3 rounded-lg border border-stone-150">
                        {analysisResult.contextAnalysis}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1.5">Evidence & Mathematical Rationale</h4>
                      <p className="text-xs text-stone-700 leading-relaxed font-sans whitespace-pre-wrap pl-1">
                        {analysisResult.reasoning}
                      </p>
                    </div>

                    <div className="border-t border-stone-100 pt-3 flex flex-wrap justify-between items-center gap-3">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400">Primary External References</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {analysisResult.recommendedSources.map((source, index) => (
                          <a
                            key={index}
                            href={`https://www.google.com/search?q=${encodeURIComponent(source)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-stone-50 hover:bg-stone-100 transition-all font-mono font-bold text-[10px] text-stone-700 uppercase px-2.5 py-1 rounded border border-stone-200 flex items-center gap-1"
                          >
                            <span>{source}</span>
                            <ExternalLink className="w-2.5 h-2.5 text-stone-400" />
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Plain Text Technical Report Export Area */}
                  <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm space-y-4" id="export-block">
                    <div className="flex justify-between items-center border-b border-stone-150 pb-2">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Auditor Export Data</h4>
                      <button
                        onClick={copyRequiredReport}
                        className="flex items-center gap-1 text-indigo-600 hover:text-indigo-500 text-xs font-bold font-mono uppercase bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-200 transition-all active:translate-y-[1px]"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        {copySuccess ? 'Copied' : 'Copy Plain Output'}
                      </button>
                    </div>
                    <pre className="text-[11px] text-stone-600 font-mono tracking-tight bg-stone-50 p-4 border border-stone-150 rounded-lg max-h-48 overflow-y-auto leading-relaxed shadow-inner">
                      {analysisResult.rawOutput}
                    </pre>
                  </div>

                </div>
              )}

            </div>

          </div>
        )}

        {/* Comparative Trace Debugger View */}
        {activeTab === 'algorithms' && (
          <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm flex flex-col gap-6 animate-fade-in" id="algorithms-tracer-container">
            
            <div className="border-b border-stone-150 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-stone-900 tracking-tight flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-indigo-500" />
                  Execution Matrix Debugger
                </h2>
                <p className="text-xs text-stone-500 mt-1">
                  Trace state changes of <strong>KMP (skip transitions)</strong> versus <strong>Rabin-Karp (rolling coefficients)</strong>.
                </p>
              </div>

              {/* Selector for target pattern to step-by-step trace */}
              <div className="flex items-center gap-2 font-mono text-xs" id="pattern-trace-selector">
                <span className="text-stone-400 uppercase tracking-wide font-semibold text-[10px]">Keyword Target:</span>
                <select
                  value={selectedPattern}
                  onChange={(e) => setSelectedPattern(e.target.value)}
                  className="bg-stone-50 text-stone-800 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-medium outline-none hover:border-stone-400 transition-all shadow-sm"
                >
                  {patterns.map((p, i) => (
                    <option key={i} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Toggle algorithms tabs */}
            <div className="flex bg-stone-100 p-1 rounded-lg max-w-[360px] self-center border border-stone-200/50" id="algo-tabs">
              <button
                onClick={() => setAlgoTab('kmp')}
                className={`flex-1 text-center px-4 py-1.5 rounded-md text-xs font-bold transition-all uppercase tracking-wide ${
                  algoTab === 'kmp' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-950'
                }`}
              >
                KMP Prefix Array
              </button>
              <button
                onClick={() => setAlgoTab('rk')}
                className={`flex-1 text-center px-4 py-1.5 rounded-md text-xs font-bold transition-all uppercase tracking-wide ${
                  algoTab === 'rk' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-[#111]'
                }`}
              >
                Rabin-Karp Rolling
              </button>
            </div>

            {/* KMP Trace Details */}
            {algoTab === 'kmp' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="kmp-visualizer-grid">
                
                {/* Left explanation and LPS display */}
                <div className="lg:col-span-4 flex flex-col gap-4" id="kmp-lps-column">
                  <div className="bg-stone-50 p-4 border border-stone-200 rounded-xl space-y-3">
                    <span className="text-[10px] text-stone-400 uppercase tracking-widest font-extrabold block">Mathematical Model</span>
                    <h3 className="text-stone-900 font-bold block text-xs">Prefix LPS Array Values</h3>
                    <p className="text-xs text-stone-500 leading-relaxed">
                      LPS represents the longest proper prefix of <code>pattern[0..i]</code> that is also a suffix of <code>pattern[0..i]</code>. Allows skipping indices during compare.
                    </p>

                    {/* LPS Table Matrix */}
                    <div className="mt-3 border border-stone-200 bg-white rounded-lg overflow-x-auto shadow-sm" id="lps-table-preview">
                      <table className="w-full text-center text-xs font-mono">
                        <thead>
                          <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 text-[10px]">
                            <th className="py-2 px-1 text-center font-bold">Char</th>
                            {selectedPattern.split('').map((char, index) => (
                              <th key={index} className="py-2 px-1 font-bold text-stone-700">{char}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-stone-100">
                            <td className="py-2 px-1 text-stone-400 bg-stone-50 text-[10px] font-bold">Idx</td>
                            {selectedPattern.split('').map((_, index) => (
                              <td key={index} className="py-2 px-1 text-[10px] text-stone-400">{index}</td>
                            ))}
                          </tr>
                          <tr className="text-indigo-600 font-bold">
                            <td className="py-2 px-1 text-stone-400 bg-stone-50 text-[10px] font-bold">LPS</td>
                            {selectedKmp.lps.map((val, index) => (
                              <td key={index} className="py-2 px-1 bg-indigo-50/20">{val}</td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="bg-stone-50 p-4 border border-stone-200 rounded-xl">
                    <span className="text-[10px] text-stone-400 uppercase tracking-widest font-extrabold block">Audit Metrics</span>
                    <div className="mt-1.5 space-y-1">
                      <span className="text-xs text-stone-500 block font-medium">Search Matches Count:</span>
                      <strong className="text-2xl text-stone-900 font-mono font-black block">
                        {selectedKmp.matches.length}
                      </strong>
                    </div>
                    {selectedKmp.matches.length > 0 && (
                      <div className="mt-2 text-[10px] font-mono bg-indigo-50 border border-indigo-100 p-2 rounded text-indigo-700">
                        Start Indices: {selectedKmp.matches.join(', ')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Step trace logs */}
                <div className="lg:col-span-8 bg-stone-50 p-4 border border-stone-200 rounded-xl flex flex-col gap-3" id="kmp-logs-column">
                  <span className="text-[10px] text-stone-400 uppercase tracking-wider font-bold block">Execution Sequence Logs:</span>
                  
                  <div className="max-h-[350px] overflow-y-auto font-mono text-[11px] text-stone-600 p-3 bg-white border border-stone-200 rounded-lg space-y-1.5">
                    {selectedKmp.steps.map((step, idx) => {
                      const isSuccess = step.includes('[KMP SUCCESS]');
                      return (
                        <div key={idx} className={`p-2 leading-relaxed border rounded ${
                          isSuccess 
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-bold shadow-sm' 
                            : 'border-stone-105 text-stone-500'
                        }`}>
                          {step}
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            )}

            {/* Rabin Karp Trace Details */}
            {algoTab === 'rk' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="rk-visualizer-grid">
                
                {/* Left parameters display */}
                <div className="lg:col-span-4 flex flex-col gap-4" id="rk-parameters-column">
                  <div className="bg-stone-50 p-4 border border-stone-200 rounded-xl space-y-3">
                    <span className="text-[10px] text-stone-400 uppercase tracking-widest font-extrabold block">Mathematical Model</span>
                    <h3 className="text-stone-900 font-bold block text-xs">Rolling Coefficients</h3>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div className="bg-white p-2 border border-stone-200 rounded-lg">
                        <span className="text-[9px] text-stone-400 block uppercase">Alphabet Base</span>
                        <strong className="text-stone-850 mt-0.5 block">256</strong>
                      </div>
                      <div className="bg-white p-2 border border-stone-200 rounded-lg">
                        <span className="text-[9px] text-stone-400 block uppercase">Modulo Prime</span>
                        <strong className="text-stone-850 mt-0.5 block">101</strong>
                      </div>
                    </div>

                    <p className="text-xs text-stone-500 leading-relaxed font-sans">
                      Composes representations using Rabin fingerprints. Compares character text sequentially ONLY when hash values match.
                    </p>

                    <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg space-y-0.5">
                      <span className="text-[9px] text-indigo-700 font-bold block uppercase">Calculated Keyword Hash:</span>
                      <strong className="text-base text-indigo-800 font-mono font-bold block">
                        {selectedRk.patternHash}
                      </strong>
                    </div>
                  </div>

                  <div className="bg-stone-50 p-4 border border-stone-200 rounded-xl">
                    <span className="text-[10px] text-stone-400 uppercase tracking-widest font-extrabold block">Verification Run</span>
                    <div className="mt-1.5 space-y-1">
                      <span className="text-xs text-stone-500 block font-medium font-sans">Total Matches Confirmed:</span>
                      <strong className="text-2xl text-stone-900 font-mono font-black block">
                        {selectedRk.matches.length}
                      </strong>
                    </div>
                    {selectedRk.matches.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <span className="text-[9px] text-stone-400 block uppercase font-bold">Spurious Hash Collisions:</span>
                        <strong className="text-sm text-amber-700 font-mono font-bold block">
                          {selectedRk.matches.reduce((acc, m) => acc + m.hashCollisions, 0)}
                        </strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Step logs */}
                <div className="lg:col-span-8 bg-stone-50 p-4 border border-stone-200 rounded-xl flex flex-col gap-3" id="rk-logs-column">
                  <span className="text-[10px] text-stone-400 uppercase tracking-wider font-bold block">Rolling Hash Pipeline:</span>
                  
                  <div className="max-h-[350px] overflow-y-auto font-mono text-[11px] text-stone-600 p-3 bg-white border border-stone-200 rounded-lg space-y-1.5">
                    {selectedRk.steps.map((step, idx) => {
                      const isSuccess = step.includes('[RK SUCCESS]');
                      const isMatch = step.includes('[RK HASH MATCH]');
                      const isCollision = step.includes('[RK COLLISION]');
                      
                      let containerClass = 'border-stone-100 text-stone-400';
                      if (isSuccess) containerClass = 'bg-emerald-50 border-emerald-200 text-emerald-800 font-bold shadow-sm';
                      else if (isMatch) containerClass = 'bg-indigo-50 border-indigo-200 text-indigo-800';
                      else if (isCollision) containerClass = 'bg-amber-50 border-amber-200 text-amber-800 font-bold';

                      return (
                        <div key={idx} className={`p-2 border rounded ${containerClass}`}>
                          {step}
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            )}

          </div>
        )}

        {/* Word Indicators Editor view */}
        {activeTab === 'patterns_lib' && (
          <div className="bg-white border border-stone-200 rounded-xl p-6 md:p-8 shadow-sm animate-fade-in" id="patterns-workspace">
            <div className="max-w-xl mx-auto flex flex-col gap-6">
              
              <div className="space-y-1.5 pb-4 border-b border-stone-150">
                <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-stone-600" />
                  Claim Indicators Database
                </h2>
                <p className="text-xs text-stone-500 font-sans">
                  The instant text alignment mechanism uses keywords registered below. Changes instantly apply to KMP and Rabin-Karp searches.
                </p>
              </div>

              {/* Add trigger workspace */}
              <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 flex items-center gap-3" id="add-trigger-workspace">
                <input
                  type="text"
                  value={newPattern}
                  onChange={(e) => setNewPattern(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddPattern()}
                  placeholder="e.g. forward immediately..."
                  className="flex-1 bg-white text-xs border border-stone-200 rounded-lg p-2.5 outline-none font-mono focus:border-stone-400 transition-all font-medium"
                />
                <button
                  onClick={handleAddPattern}
                  disabled={!newPattern.trim()}
                  className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 disabled:opacity-40 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 border border-stone-900 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Word
                </button>
              </div>

              {/* Lists */}
              <div className="space-y-3" id="registered-triggers-list">
                <span className="text-[10px] uppercase tracking-wider text-stone-400 font-bold block">Currently Active Dictionary Targets:</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" id="triggers-grid">
                  {patterns.map((it, idx) => (
                    <div
                      key={idx}
                      className="bg-stone-50 p-3 rounded-lg border border-stone-200 flex items-center justify-between gap-3 font-mono text-xs shadow-sm hover:border-stone-300 transition-all"
                    >
                      <span className="text-stone-800 font-medium truncate" title={it}>
                        {it}
                      </span>
                      <button
                        onClick={() => handleRemovePattern(it)}
                        disabled={patterns.length <= 1}
                        className="text-stone-400 hover:text-red-500 transition-all p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

      </main>

      {/* Modern, Clean footer */}
      <footer className="mt-auto border-t border-stone-200/60 bg-white/60 px-6 py-4" id="app-footer">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center text-[10px] text-stone-400 font-semibold uppercase tracking-wider gap-4">
          <span>IITR-CS Pattern Alignment Tool</span>
          <span>Logical Consistency Verified</span>
        </div>
      </footer>

    </div>
  );
}
