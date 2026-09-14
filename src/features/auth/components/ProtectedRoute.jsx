import { Navigate } from 'react-router-dom';

export const ProtectedRoute = ({ children }) => {
    // Tymczasowa flaga – symulujemy, że użytkownik NIE jest zalogowany
    const isAuthenticated = false;

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return children;
};