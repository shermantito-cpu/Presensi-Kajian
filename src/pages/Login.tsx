import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/useAppStore';

export default function Login() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Simple mock admin auth
    if (pin === '7777') {
      login('admin');
      navigate('/dashboard');
    } else {
      setError('PIN salah.');
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg border border-slate-100">
        <div className="flex flex-col items-center mb-8">
          <div className="flex justify-center mb-4">
             <img 
                src="/logp.png" 
                alt="Logo Al-Madina" 
                className="h-24 w-auto object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Login Admin</h2>
          <p className="text-slate-500 text-sm mt-1">Masukkan PIN untuk masuk dasbor</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">PIN Akses</label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-center text-2xl tracking-[0.5em]"
              placeholder="••••"
              maxLength={4}
            />
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            Masuk
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => navigate('/')}
            className="text-slate-500 hover:text-slate-700 text-sm font-medium"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    </div>
  );
}
