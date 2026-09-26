import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './features/auth/pages/LoginPage';
import { ProtectedRoute } from './features/auth/components/ProtectedRoute';
import { DashboardLayout } from './features/dashboard/components/DashboardLayout';
import { DashboardPage } from './features/dashboard/pages/DashboardPage';
import { FinancePage } from './features/dashboard/pages/FinancePage';

// Tymczasowe komponenty dla nowych modułów
const HobbyPage = () => <div><h2>Tracker Hobby</h2><p>Statystyki w budowie...</p></div>;

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<LoginPage />} />

                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <DashboardLayout />
                        </ProtectedRoute>
                    }
                >
                    {/* Outlet z Layoutu wyrenderuje odpowiedni element poniżej w zależności od adresu URL */}
                    <Route index element={<DashboardPage />} />
                    <Route path="finance" element={<FinancePage />} />
                    <Route path="hobby" element={<HobbyPage />} />
                </Route>

                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;