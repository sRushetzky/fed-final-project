import { AppBar, Toolbar, Typography, Button } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

export default function Navbar() {
    return (
        <AppBar position="static">
            <Toolbar sx={{ gap: 2 }}>
                <Typography variant="h6" sx={{ flexGrow: 1 }}>
                    Cost Manager
                </Typography>

                <Button color="inherit" component={RouterLink} to="/add-cost">
                    Add Cost
                </Button>

                <Button color="inherit" component={RouterLink} to="/report">
                    Report
                </Button>

                <Button color="inherit" component={RouterLink} to="/settings">
                    Settings
                </Button>
            </Toolbar>
        </AppBar>
    );
}
