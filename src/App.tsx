import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { CurrentResonance } from './pages/CurrentResonance';
import { Stations } from './pages/Stations';
import { ERI } from './pages/ERI';
import { Geomagnetic } from './pages/Geomagnetic';
import { Solar } from './pages/Solar';
import { Methodology } from './pages/Methodology';
import { HistoryPage } from './pages/History';

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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
