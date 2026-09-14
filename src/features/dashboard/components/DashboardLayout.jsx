import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import '../styles/dashboard.css'; // <-- Import stylów dashboardu

export const DashboardLayout = () => {
    const navigate = useNavigate();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    return (
        <div className="dashboard-layout">
            <nav className="dashboard-nav">
                <div className="dashboard-logo">Dashboard</div>

                <div className="nav-links-container">
                    <NavLink to="/dashboard" end className="nav-link">Start</NavLink>
                    <NavLink to="/dashboard/finance" className="nav-link">Finanse</NavLink>
                    <NavLink to="/dashboard/hobby" className="nav-link">Hobby</NavLink>
                </div>

                <button onClick={handleLogout} className="btn-primary logout-btn">
                    Wyloguj
                </button>
            </nav>

            <main className="dashboard-main">
                <Outlet />
            </main>
        </div>
    );
};