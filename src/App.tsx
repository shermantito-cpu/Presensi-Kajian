import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from './store/useAppStore';

// Lazy load pages for code splitting & bandwidth optimization
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Presensi = lazy(() => import('./pages/Presensi'));
const PresensiKhusus = lazy(() => import('./pages/PresensiKhusus'));

// Fallback loading component
function PageLoader() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] p-8 text-slate-500">
      <Loader2 className="animate-spin text-emerald-600 mb-2" size={32} />
      <span className="text-xs font-medium">Memuat halaman...</span>
    </div>
  );
}

// Protected Route Wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { role } = useAuth();
  if (role !== 'admin') {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex flex-col min-h-screen font-sans bg-slate-50">
        <main className="flex-1 flex flex-col">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/presensi" element={<Presensi />} />
              <Route path="/presensi-khusus" element={<PresensiKhusus />} />
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
        <footer className="w-full text-center py-6 text-sm text-slate-500 bg-transparent border-t border-slate-200/50">
          E-Presensi Kajian &copy; 2026 Al-Madina Apps
        </footer>
      </div>
    </BrowserRouter>
  );
}
