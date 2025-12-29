// NavBar.jsx
// Responsible for rendering the top navigation bar of the application

// Import UI components from Material UI
import { AppBar, Toolbar, Typography, Button } from "@mui/material";

// Import Link component from React Router (renamed to avoid name clash)
import { Link as RouterLink } from "react-router-dom";

// Navbar component – displayed on all main pages
export default function Navbar() {
    return (
        // AppBar provides a fixed application header
        <AppBar position="static">
            {/* Toolbar is used to properly space and align items inside the AppBar */}
            <Toolbar sx={{ gap: 2 }}>
                {/* Application title (aligned to the left using flexGrow) */}
                <Typography
                    variant="h6"
                    sx={{ flexGrow: 1 }}
                >
                    Cost Manager
                </Typography>

                {/* Navigation button – leads to Add Cost page */}
                <Button
                    color="inherit"
                    component={RouterLink}
                    to="/add-cost"
                >
                    Add Cost
                </Button>

                {/* Navigation button – leads to Monthly Report page */}
                <Button
                    color="inherit"
                    component={RouterLink}
                    to="/report"
                >
                    Report
                </Button>

                {/* Navigation button – leads to Pie Chart page */}
                <Button
                    color="inherit"
                    component={RouterLink}
                    to="/charts/pie"
                >
                    Pie Chart
                </Button>

                {/* Navigation button – leads to Bar Chart page */}
                <Button
                    color="inherit"
                    component={RouterLink}
                    to="/charts/bar"
                >
                    Bar Chart
                </Button>

                {/* Navigation button – leads to Settings page */}
                <Button
                    color="inherit"
                    component={RouterLink}
                    to="/settings"
                >
                    Settings
                </Button>
            </Toolbar>
        </AppBar>
    );
}
