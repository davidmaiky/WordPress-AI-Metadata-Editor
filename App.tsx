import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Sparkles, Save, FileImage, Zap, Link, Key, Bot, Cpu, Eye, EyeOff, X, History, Trash2, RotateCcw, Download, SlidersHorizontal } from 'lucide-react';
import { ImageMetadata, LogEntry, AppState, HistoryItem } from './types';
import { generateMetadata as generateGemini } from './services/geminiService';
import { generateMetadataWithOpenAI } from './services/openaiService';
import Button from './components/Button';
import { InputField, TextAreaField } from './components/InputField';
import LogViewer from './components/LogViewer';

type AiProvider = 'gemini' | 'openai';

const GEMINI_MODELS = [
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash (Recomendado)' },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro (Raciocínio Avançado)' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
  { id: 'gemini-2.0-pro-exp-02-05', name: 'Gemini 2.0 Pro (Experimental)' }
];

const OPENAI_MODELS = [
  { id: 'gpt-4o', name: 'GPT-4o (Mais Inteligente)' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Mais Rápido)' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' }
];

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [contextText, setContextText] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [compressionQuality, setCompressionQuality] = useState(0.8);
  
  const [provider, setProvider] = useState<AiProvider>('gemini');
  const [selectedGeminiModel, setSelectedGeminiModel] = useState<string>(GEMINI_MODELS[0].id);
  const [selectedOpenAIModel, setSelectedOpenAIModel] = useState<string>(OPENAI_MODELS[0].id);

  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem('wp_metadata_gemini_key') || '');
  const [openaiKey, setOpenaiKey] = useState(() => localStorage.getItem('wp_metadata_openai_key') || '');
  const [showApiKey, setShowApiKey] = useState(false);

  const [metadata, setMetadata] = useState<ImageMetadata>({
    title: '', caption: '', description: '', altText: '', tags: '', author: ''
  });
  
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const saved = localStorage.getItem('wp_metadata_history');
    return saved ? JSON.parse(saved) : [];
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('wp_metadata_gemini_key', geminiKey);
  }, [geminiKey]);

  useEffect(() => {
    localStorage.setItem('wp_metadata_openai_key', openaiKey);
  }, [openaiKey]);

  useEffect(() => {
    localStorage.setItem('wp_metadata_history', JSON.stringify(history));
  }, [history]);

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    setLogs(prev => [...prev, { timestamp, message, type }]);
  };

  const createThumbnail = (dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 100;
        const scale = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = dataUrl;
    });
  };

  const addToHistory = async (newMetadata: ImageMetadata, sourceUrl: string, fileName: string) => {
    const thumbnail = await createThumbnail(sourceUrl);
    const newItem: HistoryItem = {
      id: crypto.randomUUID(),
      timestamp: new Date().toLocaleString('pt-BR'),
      metadata: newMetadata,
      thumbnail,
      fileName
    };
    setHistory(prev => [newItem, ...prev].slice(0, 20));
  };

  const restoreFromHistory = (item: HistoryItem) => {
    setMetadata(item.metadata);
    addLog(`Metadados de "${item.fileName}" restaurados do histórico.`, 'success');
    window.scrollTo({ top: 400, behavior: 'smooth' });
  };

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const clearHistory = () => {
    if (confirm('Tem certeza que deseja limpar todo o histórico?')) {
      setHistory([]);
      addLog('Histórico limpo.', 'info');
    }
  };

  const handleSaveKey = () => {
    const providerName = provider === 'gemini' ? 'Gemini' : 'OpenAI';
    addLog(`Chave API do ${providerName} salva com sucesso!`, 'success');
  };

  const handleClearKey = () => {
    if (provider === 'gemini') setGeminiKey('');
    else setOpenaiKey('');
  };

  const currentKeyValue = provider === 'gemini' ? geminiKey : openaiKey;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const processNewFile = (selectedFile: File) => {
    if (!selectedFile.type.startsWith('image/')) {
      addLog('Arquivo inválido.', 'error');
      return;
    }
    setFile(selectedFile);
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
    addLog(`Imagem carregada: ${selectedFile.name}`, 'success');
    setMetadata({ title: '', caption: '', description: '', altText: '', tags: '', author: '' });
  };

  const handleUrlLoad = async () => {
    if (!urlInput) return;
    setIsLoadingUrl(true);
    addLog('Baixando imagem...', 'info');
    try {
      const proxyUrl = `https://wsrv.nl/?url=${encodeURIComponent(urlInput)}`;
      const response = await fetch(proxyUrl);
      const blob = await response.blob();
      const newFile = new File([blob], 'imagem_url.jpg', { type: blob.type || 'image/jpeg' });
      processNewFile(newFile);
      setUrlInput('');
    } catch (error) {
      addLog('Erro ao baixar imagem via URL.', 'error');
    } finally {
      setIsLoadingUrl(false);
    }
  };

  const handleGenerate = async () => {
    if (!file || !previewUrl) return;
    const currentKey = provider === 'gemini' ? geminiKey : openaiKey;
    if (!currentKey.trim()) {
      addLog('Chave API obrigatória.', 'error');
      return;
    }

    setAppState(AppState.GENERATING);
    addLog(`Gerando metadados com ${provider}...`, 'info');

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const fullBase64 = reader.result as string;
        let generatedData: ImageMetadata;
        
        if (provider === 'gemini') {
          generatedData = await generateGemini(base64, contextText, currentKey, selectedGeminiModel, file.type);
        } else {
          generatedData = await generateMetadataWithOpenAI(base64, contextText, currentKey, selectedOpenAIModel, file.type);
        }
        
        setMetadata(generatedData);
        await addToHistory(generatedData, fullBase64, file.name);
        addLog('Metadados gerados e salvos no histórico!', 'success');
        setAppState(AppState.IDLE);
      };
    } catch (error: any) {
      addLog(`Erro: ${error.message}`, 'error');
      setAppState(AppState.IDLE);
    }
  };

  const handleCompressAndExport = useCallback(() => {
    if (!previewUrl || !file) return;
    setAppState(AppState.OPTIMIZING);
    addLog(`Comprimindo imagem para ${Math.round(compressionQuality * 100)}% de qualidade...`, 'info');
    
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width; 
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Fill background white in case of transparency when converting to JPEG
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const originalSize = file.size;
          const newSize = blob.size;
          
          const newFileName = `${file.name.split('.')[0]}_compressed.jpg`;
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = newFileName;
          link.click();
          
          addLog(`Exportação concluída: ${formatBytes(originalSize)} -> ${formatBytes(newSize)} (${Math.round((1 - newSize/originalSize)*100)}% reduzido)`, 'success');
        }
        setAppState(AppState.IDLE);
      }, 'image/jpeg', compressionQuality);
    };
    img.src = previewUrl;
  }, [previewUrl, file, compressionQuality]);

  const handleConvertToWebP = useCallback(() => {
    if (!previewUrl || !file) return;
    setAppState(AppState.CONVERTING);
    addLog('Convertendo para WebP...', 'info');
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);
      const webpDataUrl = canvas.toDataURL('image/webp', compressionQuality);
      const link = document.createElement('a');
      link.href = webpDataUrl;
      link.download = `${file.name.split('.')[0]}.webp`;
      link.click();
      addLog('WebP exportado.', 'success');
      setAppState(AppState.IDLE);
    };
    img.src = previewUrl;
  }, [previewUrl, file, compressionQuality]);

  const handleSaveWithMetadata = () => {
    if (!file) return;
    // Download JSON
    const jsonString = JSON.stringify(metadata, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${file.name.split('.')[0]}_metadata.json`;
    link.click();
    
    // Download optimized image (using current quality)
    handleCompressAndExport();
  };

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
      <div className="max-w-3xl w-full bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden mb-8">
        
        <div className="bg-slate-800 p-6 text-center">
          <h1 className="text-2xl font-bold text-white flex items-center justify-center gap-3">
            <Sparkles className="text-yellow-400" />
            Editor de Metadados com IA
          </h1>
          <p className="text-slate-400 text-sm mt-1">SEO Inteligente para Imagens WordPress</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Configuração API */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
            <div className="flex justify-center gap-2">
              <button onClick={() => setProvider('gemini')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${provider === 'gemini' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-gray-600 border'}`}>Gemini</button>
              <button onClick={() => setProvider('openai')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${provider === 'openai' ? 'bg-green-600 text-white shadow-sm' : 'bg-white text-gray-600 border'}`}>OpenAI</button>
            </div>
            
            <select className="w-full p-2 border rounded-lg text-sm bg-white" value={provider === 'gemini' ? selectedGeminiModel : selectedOpenAIModel} onChange={(e) => provider === 'gemini' ? setSelectedGeminiModel(e.target.value) : setSelectedOpenAIModel(e.target.value)}>
              {(provider === 'gemini' ? GEMINI_MODELS : OPENAI_MODELS).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>

            <div className="flex gap-2">
              <div className="relative flex-grow">
                <input type={showApiKey ? "text" : "password"} className="w-full pl-10 pr-20 py-2 border rounded-lg text-sm" placeholder="Sua Chave API..." value={currentKeyValue} onChange={(e) => provider === 'gemini' ? setGeminiKey(e.target.value) : setOpenaiKey(e.target.value)} />
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 gap-1">
                  {currentKeyValue && <button onClick={handleClearKey} className="p-1 text-gray-400 hover:text-red-500 transition-colors"><X size={16}/></button>}
                  <button onClick={() => setShowApiKey(!showApiKey)} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">{showApiKey ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
                </div>
              </div>
              <Button variant="secondary" onClick={handleSaveKey} className="!w-auto !px-3"><Save size={18}/></Button>
            </div>
          </div>

          {/* Input de URL */}
          <div className="relative">
            <input type="url" className="w-full pl-10 pr-32 py-3 bg-slate-50 border rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all" placeholder="Link da imagem..." value={urlInput} onChange={(e) => setUrlInput(e.target.value)} />
            {urlInput && <button onClick={() => setUrlInput('')} className="absolute right-24 top-3.5 text-gray-400 hover:text-red-500 transition-colors"><X size={20}/></button>}
            <Button onClick={handleUrlLoad} isLoading={isLoadingUrl} className="absolute right-1.5 top-1.5 bottom-1.5 !w-auto !px-4 !py-0 bg-slate-800 text-xs">Carregar</Button>
          </div>

          {/* Upload */}
          <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-slate-50 transition-all group" onClick={() => fileInputRef.current?.click()}>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && processNewFile(e.target.files[0])} />
            {previewUrl ? (
              <div className="space-y-2">
                <img src={previewUrl} className="max-h-56 mx-auto rounded shadow-lg border border-gray-200" />
                <p className="text-xs text-gray-500 font-mono bg-gray-100 inline-block px-2 py-1 rounded">{file?.name} ({file ? formatBytes(file.size) : ''})</p>
                <p className="text-[10px] text-blue-500 group-hover:underline">Trocar imagem</p>
              </div>
            ) : (
              <div className="py-8 space-y-3">
                <Upload className="mx-auto text-blue-500 group-hover:scale-110 transition-transform" size={40} />
                <div className="space-y-1">
                  <p className="text-base font-semibold text-gray-700">Clique ou arraste para upload</p>
                  <p className="text-xs text-gray-400 text-center">Formatos suportados: JPG, PNG, WEBP</p>
                </div>
              </div>
            )}
          </div>

          {/* Contexto */}
          <div className="relative">
            <textarea className="w-full p-3 border rounded-lg text-sm min-h-[80px] focus:ring-2 focus:ring-blue-500/20 transition-all" placeholder="Diga à IA onde esta imagem será usada (ex: blog de receitas)..." value={contextText} onChange={(e) => setContextText(e.target.value)} />
            {contextText && <button onClick={() => setContextText('')} className="absolute top-2 right-2 text-gray-400 hover:text-red-500"><X size={16}/></button>}
          </div>

          <Button variant="success" onClick={handleGenerate} isLoading={appState === AppState.GENERATING} disabled={!file} icon={<Sparkles size={20}/>}>Gerar Metadados SEO</Button>

          {/* Formulário de Metadados */}
          <div className="space-y-4 bg-gray-50 p-5 rounded-lg border border-gray-200">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Metadados Gerados</h3>
            <InputField label="Texto Alternativo (Alt Text)" value={metadata.altText} onChange={(e) => setMetadata({...metadata, altText: e.target.value})} />
            <InputField label="Título da Imagem" value={metadata.title} onChange={(e) => setMetadata({...metadata, title: e.target.value})} />
            <InputField label="Legenda (Caption)" value={metadata.caption} onChange={(e) => setMetadata({...metadata, caption: e.target.value})} />
            <TextAreaField label="Descrição Detalhada" value={metadata.description} onChange={(e) => setMetadata({...metadata, description: e.target.value})} />
            <InputField label="Tags (SEO)" value={metadata.tags} onChange={(e) => setMetadata({...metadata, tags: e.target.value})} />
          </div>

          {/* Configurações de Otimização */}
          <div className="bg-blue-50/50 p-5 rounded-lg border border-blue-100 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <SlidersHorizontal size={18} className="text-blue-600" />
              <h3 className="text-sm font-bold text-blue-900">Configurações de Exportação</h3>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium text-blue-700">
                <span>Compressão: {Math.round((1 - compressionQuality) * 100)}%</span>
                <span>Qualidade: {Math.round(compressionQuality * 100)}%</span>
              </div>
              <input 
                type="range" 
                min="0.1" 
                max="1.0" 
                step="0.05" 
                value={compressionQuality} 
                onChange={(e) => setCompressionQuality(parseFloat(e.target.value))}
                className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>Menor Arquivo</span>
                <span>Melhor Qualidade</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button 
                variant="primary" 
                onClick={handleCompressAndExport} 
                disabled={!file || appState === AppState.OPTIMIZING} 
                isLoading={appState === AppState.OPTIMIZING}
                icon={<Zap size={18}/>}
                className="!text-xs"
              >
                Comprimir e Exportar JPG
              </Button>
              <Button 
                variant="warning" 
                onClick={handleConvertToWebP} 
                disabled={!file || appState === AppState.CONVERTING} 
                isLoading={appState === AppState.CONVERTING}
                icon={<FileImage size={18}/>}
                className="!text-xs"
              >
                Exportar WebP
              </Button>
            </div>
          </div>

          <Button 
            variant="danger" 
            onClick={handleSaveWithMetadata} 
            disabled={!file} 
            icon={<Download size={20}/>}
            className="py-4 shadow-md hover:shadow-lg"
          >
            Baixar Pacote Completo (JSON + Imagem)
          </Button>

          <LogViewer logs={logs} />
        </div>
      </div>

      {/* Seção de Histórico */}
      <div className="max-w-3xl w-full bg-white rounded-xl shadow-lg border p-6">
        <div className="flex items-center justify-between mb-6 border-b pb-4">
          <div className="flex items-center gap-2 text-slate-800">
            <History size={24} className="text-blue-500" />
            <h2 className="text-xl font-bold">Histórico Recente</h2>
          </div>
          {history.length > 0 && (
            <button onClick={clearHistory} className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1 transition-colors">
              <Trash2 size={16} /> Limpar Tudo
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Bot size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-sm">Suas gerações aparecerão aqui.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {history.map((item) => (
              <div key={item.id} className="group relative border rounded-lg p-3 hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer shadow-sm hover:shadow" onClick={() => restoreFromHistory(item)}>
                <div className="flex gap-3">
                  <img src={item.thumbnail} className="w-16 h-16 object-cover rounded border bg-white shadow-inner" alt="Thumbnail" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-700 truncate mb-1">{item.metadata.title || 'Sem Título'}</p>
                    <p className="text-[10px] text-gray-400 truncate">{item.fileName}</p>
                    <p className="text-[10px] text-gray-400 mt-2 bg-gray-100 inline-block px-1 rounded">{item.timestamp}</p>
                  </div>
                </div>
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); restoreFromHistory(item); }} className="p-1.5 bg-white shadow-sm border rounded hover:text-blue-500 transition-colors" title="Restaurar Metadados">
                    <RotateCcw size={14} />
                  </button>
                  <button onClick={(e) => deleteHistoryItem(item.id, e)} className="p-1.5 bg-white shadow-sm border rounded hover:text-red-500 transition-colors" title="Remover do Histórico">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;