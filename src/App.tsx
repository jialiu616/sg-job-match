import { HashRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { SeekerPage } from './pages/SeekerPage';
import { EmployerPage } from './pages/EmployerPage';
import { MatchesPage } from './pages/MatchesPage';

function App() {
  return (
    <HashRouter>
      <AppProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/seeker" element={<SeekerPage />} />
            <Route path="/employer" element={<EmployerPage />} />
            <Route path="/matches" element={<MatchesPage />} />
          </Routes>
        </Layout>
      </AppProvider>
    </HashRouter>
  );
}

export default App;
