import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ExecutiveDashboard from './screens/ExecutiveDashboard';
import DashboardScreen from './screens/DashboardScreen';
import QuoteScreen from './screens/QuoteScreen';
import { TenderImportScreen, TenderMatchScreen, TenderFinalScreen } from './screens/TenderScreens';
import CatalogScreen from './screens/CatalogScreen';
import CrmApp from './crm/CrmApp';
import Dashboard from './crm/pages/Index';
import Campaigns from './crm/pages/Campaigns';
import CampaignDetail from './crm/pages/CampaignDetail';
import Prospects from './crm/pages/Prospects';
import ProspectDetail from './crm/pages/ProspectDetail';
import CompanyDetail from './crm/pages/CompanyDetail';
import Scripts from './crm/pages/Scripts';
import EmailTemplates from './crm/pages/EmailTemplates';
import SettingsPage from './crm/pages/SettingsPage';
import CallQueue from './crm/pages/CallQueue';
import Analytics from './crm/pages/Analytics';
import Login from './crm/pages/Login';
import Signup from './crm/pages/Signup';
import ImportCSV from './crm/pages/ImportCSV';
import NotFound from './crm/pages/NotFound';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/exec" replace />} />
        <Route path="/exec" element={<ExecutiveDashboard />} />
        <Route path="/dashboard" element={<DashboardScreen />} />
        <Route path="/quotes" element={<QuoteScreen />} />
        <Route path="/quotes/new" element={<QuoteScreen />} />
        <Route path="/tender" element={<TenderImportScreen />} />
        <Route path="/tender/match" element={<TenderMatchScreen />} />
        <Route path="/tender/final" element={<TenderFinalScreen />} />
        <Route path="/catalog" element={<CatalogScreen />} />
        <Route path="/crm" element={<CrmApp />}>
          <Route index element={<Dashboard />} />
          <Route path="login" element={<Login />} />
          <Route path="signup" element={<Signup />} />
          <Route path="call-queue" element={<CallQueue />} />
          <Route path="campaigns" element={<Campaigns />} />
          <Route path="campaigns/:id" element={<CampaignDetail />} />
          <Route path="import" element={<ImportCSV />} />
          <Route path="prospects" element={<Prospects />} />
          <Route path="prospects/:id" element={<ProspectDetail />} />
          <Route path="companies/:id" element={<CompanyDetail />} />
          <Route path="scripts" element={<Scripts />} />
          <Route path="emails" element={<EmailTemplates />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
