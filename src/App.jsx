import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ExecutiveDashboard from './screens/ExecutiveDashboard';
import DashboardScreen from './screens/DashboardScreen';
import InboxScreen from './screens/InboxScreen';
import DetailScreen from './screens/DetailScreen';
import QuoteScreen from './screens/QuoteScreen';
import ScheduleScreen from './screens/ScheduleScreen';
import ClientScreen from './screens/ClientScreen';
import MobileScreen from './screens/MobileScreen';
import { TenderImportScreen, TenderMatchScreen, TenderFinalScreen } from './screens/TenderScreens';
import { CrmPipelineScreen, CrmDetailScreen, CrmContactPopup } from './screens/CrmScreens';
import CatalogScreen from './screens/CatalogScreen';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/exec" replace />} />
        <Route path="/exec" element={<ExecutiveDashboard />} />
        <Route path="/dashboard" element={<DashboardScreen />} />
        <Route path="/inbox" element={<InboxScreen />} />
        <Route path="/requests/:id" element={<DetailScreen />} />
        <Route path="/quotes" element={<QuoteScreen />} />
        <Route path="/quotes/new" element={<QuoteScreen />} />
        <Route path="/schedule" element={<ScheduleScreen />} />
        <Route path="/clients" element={<ClientScreen />} />
        <Route path="/clients/:id" element={<ClientScreen />} />
        <Route path="/mobile" element={<MobileScreen />} />
        <Route path="/tender" element={<TenderImportScreen />} />
        <Route path="/tender/match" element={<TenderMatchScreen />} />
        <Route path="/tender/final" element={<TenderFinalScreen />} />
        <Route path="/catalog" element={<CatalogScreen />} />
        <Route path="/crm" element={<CrmPipelineScreen />} />
        <Route path="/crm/contact" element={<CrmContactPopup />} />
        <Route path="/crm/:id" element={<CrmDetailScreen />} />
      </Routes>
    </BrowserRouter>
  );
}
