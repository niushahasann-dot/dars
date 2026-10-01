import React, { useState, useEffect } from 'react';
import { Terminal, Clipboard, Check, RefreshCw, X, AlertOctagon } from 'lucide-react';
import { API_BASE_URL } from '../../services/apiConfig';

interface LogEntry {
  time: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  msg: string;
}

export const LogsConsole: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Capture client-side errors and warnings dynamically
  useEffect(() => {
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;

    const reportClientLog = async (level: 'WARN' | 'ERROR', msg: string, stack?: string) => {
      try {
        await fetch(`${API_BASE_URL}/api/logs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            level,
            msg,
            details: stack || '',
          }),
        });
      } catch {
        // ignore log reporting failures
      }
    };

    console.error = (...args: any[]) => {
      const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
      const errStack = args.find(arg => arg instanceof Error)?.stack;
      reportClientLog('ERROR', msg, errStack);
      originalConsoleError.apply(console, args);
    };

    console.warn = (...args: any[]) => {
      const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
      reportClientLog('WARN', msg);
      originalConsoleWarn.apply(console, args);
    };

    // Capture unhandled promise rejections or runtime errors
    const handleRuntimeError = (e: ErrorEvent) => {
      reportClientLog('ERROR', `Runtime: ${e.message}`, e.error?.stack);
    };

    const handleRejection = (e: PromiseRejectionEvent) => {
      reportClientLog('ERROR', `Promise Rejection: ${e.reason?.message || e.reason}`, e.reason?.stack);
    };

    window.addEventListener('error', handleRuntimeError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
      window.removeEventListener('error', handleRuntimeError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/logs`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.logs)) {
          setLogs(data.logs);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch system logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
      const interval = setInterval(fetchLogs, 4000); // Live update logs every 4 seconds when open
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const copyToClipboard = () => {
    const text = logs
      .map((l) => `[${l.time}] [${l.level}] ${l.msg}`)
      .join('\n');
    
    navigator.clipboard.writeText(text || 'هیچ لاگی ثبت نشده است.').then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 z-50 p-3 rounded-full bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 shadow-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer font-semibold text-xs border border-slate-700/50 dark:border-slate-200"
        title="نمایش لاگ‌های سیستم"
      >
        <Terminal className="w-4 h-4 text-indigo-500 animate-pulse" />
        <span>لاگ‌های سیستم</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm transition-all" dir="rtl">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-sm">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">کنسول عیب‌یابی و لاگ‌های سیستم</h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">لاگ‌ها را کپی کنید و برای مهندس پشتیبان بفرستید.</p>
            </div>
          </div>
          
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Logs Terminal Area */}
        <div className="flex-1 p-5 overflow-y-auto bg-slate-950 text-slate-200 font-mono text-[11px] leading-relaxed space-y-2 select-text selection:bg-indigo-500 selection:text-white">
          {isLoading && logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" />
              <span>در حال بارگذاری و تحلیل لاگ‌ها...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-500">
              <AlertOctagon className="w-5 h-5 text-slate-600" />
              <span>هنوز هیچ لاگی ثبت نشده است. ساخت اتاق را تست کنید تا لاگ بگیرید.</span>
            </div>
          ) : (
            logs.map((log, idx) => {
              const levelColor =
                log.level === 'ERROR'
                  ? 'text-rose-500 font-bold'
                  : log.level === 'WARN'
                  ? 'text-amber-500 font-bold'
                  : 'text-emerald-500';

              return (
                <div key={idx} className="border-b border-slate-900/60 pb-1.5 last:border-b-0">
                  <span className="text-slate-500 text-[10px] select-none ml-2">
                    {new Date(log.time).toLocaleTimeString('fa-IR', { hour12: false })}
                  </span>
                  <span className={`ml-2 [${levelColor}]`}>
                    [{log.level}]
                  </span>
                  <span className="whitespace-pre-wrap word-break break-all select-all">
                    {log.msg}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Action Buttons Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <button
              onClick={fetchLogs}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>بروزرسانی</span>
            </button>
          </div>

          <button
            onClick={copyToClipboard}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>لاگ‌ها کپی شدند!</span>
              </>
            ) : (
              <>
                <Clipboard className="w-4 h-4" />
                <span>کپی کردن کل لاگ‌ها</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
