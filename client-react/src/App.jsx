import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import AddCostPage from "./pages/AddCostPage";
import SettingsPage from "./pages/SettingsPage";
import ReportPage from "./pages/ReportPage";

export default function App() {
    return (
        <BrowserRouter>
            <Navbar />
            <Routes>
                <Route path="/" element={<Navigate to="/add-cost" replace />} />
                <Route path="/add-cost" element={<AddCostPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/report" element={<ReportPage />} />
            </Routes>
        </BrowserRouter>
    );
}
