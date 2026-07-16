import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { Background } from './components/Background';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Spinner } from './components/ui';
import { GamePage } from './pages/GamePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { NotFoundPage } from './pages/NotFoundPage';

// Code-split secondary routes for faster initial load
const ProfilePage   = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const AboutPage     = lazy(() => import('./pages/AboutPage').then(m => ({ default: m.AboutPage })));
const TermsPage     = lazy(() => import('./pages/TermsPage').then(m => ({ default: m.TermsPage })));
const PrivacyPage   = lazy(() => import('./pages/PrivacyPage').then(m => ({ default: m.PrivacyPage })));
const ContactPage   = lazy(() => import('./pages/ContactPage').then(m => ({ default: m.ContactPage })));
const RankingsPage  = lazy(() => import('./pages/RankingsPage').then(m => ({ default: m.RankingsPage })));

// Trivia Party mode — fully separate module bundle
const TriviaLandingPage = lazy(() => import('./trivia/pages/TriviaLandingPage').then(m => ({ default: m.TriviaLandingPage })));
const TriviaSoloPage    = lazy(() => import('./trivia/pages/TriviaSoloPage').then(m => ({ default: m.TriviaSoloPage })));
const TriviaLobbyPage   = lazy(() => import('./trivia/pages/TriviaLobbyPage').then(m => ({ default: m.TriviaLobbyPage })));
const TriviaGamePage    = lazy(() => import('./trivia/pages/TriviaGamePage').then(m => ({ default: m.TriviaGamePage })));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Spinner className="text-4xl text-gold" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <Spinner className="text-4xl text-gold" />
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<GamePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <ProfilePage />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route path="/about" element={<Suspense fallback={<PageLoader />}><AboutPage /></Suspense>} />
      <Route path="/terms" element={<Suspense fallback={<PageLoader />}><TermsPage /></Suspense>} />
      <Route path="/privacy" element={<Suspense fallback={<PageLoader />}><PrivacyPage /></Suspense>} />
      <Route path="/contact" element={<Suspense fallback={<PageLoader />}><ContactPage /></Suspense>} />
      <Route path="/rankings" element={<Suspense fallback={<PageLoader />}><RankingsPage /></Suspense>} />
      {/* Trivia Party mode — all guest-accessible, no auth required */}
      <Route path="/trivia" element={<Suspense fallback={<PageLoader />}><TriviaLandingPage /></Suspense>} />
      <Route path="/trivia/solo" element={<Suspense fallback={<PageLoader />}><TriviaSoloPage /></Suspense>} />
      <Route path="/trivia/room/:code" element={<Suspense fallback={<PageLoader />}><TriviaLobbyPage /></Suspense>} />
      <Route path="/trivia/game/:code" element={<Suspense fallback={<PageLoader />}><TriviaGamePage /></Suspense>} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Background>
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1">
              <AppRoutes />
            </main>
            <Footer />
          </div>
        </Background>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
