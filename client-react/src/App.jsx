// App.jsx
// Root component of the application – responsible for routing and global layout

// React Router components for client-side routing
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Shared layout component (top navigation bar)
import Navbar from "./components/Navbar";

// Application pages
import AddCostPage from "./pages/AddCostPage";
import SettingsPage from "./pages/SettingsPage";
import ReportPage from "./pages/ReportPage";
import PieChartPage from "./pages/PieChartPage";
import BarChartPage from "./pages/BarChartPage";

// App component – defines routes and overall app structure
export default function App() {
    return (
        // BrowserRouter enables client-side routing using the HTML5 history API
        <BrowserRouter>
            {/* Navigation bar is shown on all pages */}
            <Navbar />

            {/* Routes container – defines all application routes */}
            <Routes>
                {/* Default route: redirect "/" to the Add Cost page */}
                <Route
                    path="/"
                    element={<Navigate to="/add-cost" replace />}
                />

                {/* Add new cost item */}
                <Route
                    path="/add-cost"
                    element={<AddCostPage />}
                />

                {/* Application settings (exchange rates URL) */}
                <Route
                    path="/settings"
                    element={<SettingsPage />}
                />

                {/* Monthly report page */}
                <Route
                    path="/report"
                    element={<ReportPage />}
                />

                {/* Pie chart by category */}
                <Route
                    path="/charts/pie"
                    element={<PieChartPage />}
                />

                {/* Bar chart by month */}
                <Route
                    path="/charts/bar"
                    element={<BarChartPage />}
                />
            </Routes>
        </BrowserRouter>
    );
}
