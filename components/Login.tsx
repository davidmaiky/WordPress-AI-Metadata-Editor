import React, { useState, useEffect } from 'react';
import { Lock, User, Eye, EyeOff, LogIn, UserPlus, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (username: string, rememberMe: boolean) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize default user (admin / admin) if no users exist
  useEffect(() => {
    const existingUsers = localStorage.getItem('wp_metadata_users');
    if (!existingUsers) {
      const defaultUsers = [{ username: 'admin', password: 'admin' }];
      localStorage.setItem('wp_metadata_users', JSON.stringify(defaultUsers));
    }
  }, []);

  const clearForm = () => {
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setError(null);
    setSuccess(null);
  };

  const handleToggleTab = (toLogin: boolean) => {
    setIsLoginTab(toLogin);
    clearForm();
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!username.trim() || !password.trim()) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    setIsLoading(true);

    // Simulate network latency for premium feel
    setTimeout(() => {
      try {
        const usersStr = localStorage.getItem('wp_metadata_users') || '[]';
        const users = JSON.parse(usersStr);

        const foundUser = users.find(
          (u: any) => u.username.toLowerCase() === username.trim().toLowerCase()
        );

        if (!foundUser || foundUser.password !== password) {
          setError('Usuário ou senha incorretos.');
          setIsLoading(false);
          return;
        }

        setSuccess('Login realizado com sucesso! Redirecionando...');
        setTimeout(() => {
          onLoginSuccess(foundUser.username, rememberMe);
        }, 800);
      } catch (err) {
        setError('Ocorreu um erro no processamento do login.');
        setIsLoading(false);
      }
    }, 600);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!username.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    if (username.length < 3) {
      setError('O nome de usuário deve ter pelo menos 3 caracteres.');
      return;
    }

    if (password.length < 4) {
      setError('A senha deve ter pelo menos 4 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      try {
        const usersStr = localStorage.getItem('wp_metadata_users') || '[]';
        const users = JSON.parse(usersStr);

        const userExists = users.some(
          (u: any) => u.username.toLowerCase() === username.trim().toLowerCase()
        );

        if (userExists) {
          setError('Este nome de usuário já está em uso.');
          setIsLoading(false);
          return;
        }

        // Register new user
        const newUser = { username: username.trim(), password };
        users.push(newUser);
        localStorage.setItem('wp_metadata_users', JSON.stringify(users));

        setSuccess('Conta criada com sucesso! Redirecionando para o login...');
        setIsLoading(false);
        
        setTimeout(() => {
          setIsLoginTab(true);
          setConfirmPassword('');
          setPassword('');
          setError(null);
          setSuccess(null);
        }, 1500);
      } catch (err) {
        setError('Erro ao criar conta.');
        setIsLoading(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 p-4 sm:p-6 md:p-8 relative overflow-hidden">
      {/* Dynamic/Decorative elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      
      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-800/80 overflow-hidden relative z-10 transition-all duration-300">
        {/* Header/Brand */}
        <div className="p-6 text-center border-b border-slate-800/50">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 mb-3 animate-pulse">
            <Sparkles size={24} />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Editor de Metadados IA
          </h1>
          <p className="text-slate-400 text-xs mt-1.5">
            Otimização Inteligente SEO para Imagens WordPress
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-slate-800/30">
          <button
            onClick={() => handleToggleTab(true)}
            className={`flex-1 py-3 text-sm font-medium transition-all ${
              isLoginTab
                ? 'text-indigo-400 border-b-2 border-indigo-500 bg-slate-800/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/10'
            }`}
          >
            Acessar Conta
          </button>
          <button
            onClick={() => handleToggleTab(false)}
            className={`flex-1 py-3 text-sm font-medium transition-all ${
              !isLoginTab
                ? 'text-indigo-400 border-b-2 border-indigo-500 bg-slate-800/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/10'
            }`}
          >
            Cadastrar-se
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8">
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-950/40 border border-red-800/60 text-red-200 text-xs flex items-center gap-2 animate-shake">
              <AlertCircle size={16} className="text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-5 p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-200 text-xs flex items-center gap-2 animate-fade-in">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={isLoginTab ? handleLogin : handleRegister} className="space-y-4">
            {/* Username Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                Nome de Usuário
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <User size={16} />
                </span>
                <input
                  type="text"
                  required
                  placeholder={isLoginTab ? "admin" : "Escolha seu usuário"}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950/40 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block flex justify-between">
                <span>Senha</span>
                {isLoginTab && (
                  <span className="text-[10px] text-slate-500 font-normal">
                    Padrão: admin
                  </span>
                )}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <Lock size={16} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder={isLoginTab ? "••••••••" : "Mínimo 4 caracteres"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-950/40 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password (only for Register) */}
            {!isLoginTab && (
              <div className="space-y-1.5 animate-slide-down">
                <label className="text-xs font-semibold text-slate-300 block">
                  Confirmar Senha
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <Lock size={16} />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Confirme sua senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950/40 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  />
                </div>
              </div>
            )}

            {/* Remember Me Checkbox (only for Login) */}
            {isLoginTab && (
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer group select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">
                    Manter conectado
                  </span>
                </label>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:opacity-50 text-white rounded-lg text-sm font-semibold shadow-lg hover:shadow-indigo-500/20 active:transform active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : isLoginTab ? (
                <>
                  <LogIn size={18} />
                  <span>Entrar no Sistema</span>
                </>
              ) : (
                <>
                  <UserPlus size={18} />
                  <span>Criar Conta</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
