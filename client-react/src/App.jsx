import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import AddCostPage from "./pages/AddCostPage";
import SettingsPage from "./pages/SettingsPage";
import ReportPage from "./pages/ReportPage";
import PieChartPage from "./pages/PieChartPage";
import BarChartPage from "./pages/BarChartPage";

export default function App() {
    return (
        <BrowserRouter>
            <Navbar />
            <Routes>
                <Route path="/" element={<Navigate to="/add-cost" replace />} />
                <Route path="/add-cost" element={<AddCostPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/report" element={<ReportPage />} />
                <Route path="/charts/pie" element={<PieChartPage />} />
                <Route path="/charts/bar" element={<BarChartPage />} />
            </Routes>
        </BrowserRouter>
    );
}
