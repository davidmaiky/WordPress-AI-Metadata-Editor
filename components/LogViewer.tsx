import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';
import { ScrollText } from 'lucide-react';

interface LogViewerProps {
  logs: LogEntry[];
}

const LogViewer: React.FC<LogViewerProps> = ({ logs }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="mt-6 border border-gray-300 rounded-md bg-gray-50 overflow-hidden flex flex-col h-48 shadow-inner">
      <div className="bg-gray-200 px-3 py-1 flex items-center gap-2 border-b border-gray-300 text-gray-600 text-sm font-medium">
        <ScrollText size={16} />
        LOG DO SISTEMA
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 font-mono text-xs space-y-1">
        {logs.length === 0 ? (
          <div className="text-gray-400 italic text-center mt-10">Aguardando ações...</div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className={`flex gap-2 ${
              log.type === 'error' ? 'text-red-600' : 
              log.type === 'success' ? 'text-green-600' : 
              log.type === 'warning' ? 'text-orange-600' : 'text-gray-700'
            }`}>
              <span className="text-gray-400 select-none">[{log.timestamp}]</span>
              <span>{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LogViewer;