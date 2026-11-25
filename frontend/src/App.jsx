import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Analytics from "./pages/Analytics";
import Budget from "./pages/Budget";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Transactions from "./pages/Transactions";
import Payments from "./pages/Payments";

function App() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route
                            element={
                                <ProtectedRoute>
                                    <Layout />
                                </ProtectedRoute>
                            }
                        >
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/transactions" element={<Transactions />} />
                            <Route path="/payments" element={<Payments />} />
                            <Route path="/analytics" element={<Analytics />} />
                            <Route path="/budget" element={<Budget />} />
                        </Route>
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </BrowserRouter>
            </AuthProvider>
        </ThemeProvider>
    );
}

export default App;
