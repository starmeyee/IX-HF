import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Homework from './pages/Homework';
import HolidayHomework from './pages/HolidayHomework';
import { Heart } from 'lucide-react';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <div className="app-container">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/homework" element={<Homework />} />
            <Route path="/holidays" element={<HolidayHomework />} />
          </Routes>
        </main>
        <footer className="app-footer">
          <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            Designed and developed by <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Utkarsh</span> <Heart size={14} color="var(--secondary)" fill="var(--secondary)" />
          </p>
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;
