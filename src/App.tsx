import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { CurrentResonance } from './pages/CurrentResonance';
import { Stations } from './pages/Stations';
import { ERI } from './pages/ERI';
import { Geomagnetic } from './pages/Geomagnetic';
import { Solar } from './pages/Solar';
import { Methodology } from './pages/Methodology';
import { NotFound } from './pages/NotFound';
import { HistoryPage } from './pages/History';
import { Articles } from './pages/Articles';
import { ArticleSchumann } from './pages/ArticleSchumann';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="atual" element={<CurrentResonance />} />
          <Route path="historico" element={<HistoryPage />} />
          <Route path="estacoes" element={<Stations />} />
          <Route path="indice" element={<ERI />} />
          <Route path="geomagnetica" element={<Geomagnetic />} />
          <Route path="solar" element={<Solar />} />
          <Route path="metodologia" element={<Methodology />} />
          <Route path="artigos" element={<Articles />} />
          <Route path="artigos/o-que-e-ressonancia-schumann" element={<ArticleSchumann />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
