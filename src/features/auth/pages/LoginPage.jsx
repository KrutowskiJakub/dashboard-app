import { LoginForm } from '../components/LoginForm';
import '../styles/auth.css';

export const LoginPage = () => {
    return (
        <main className="login-page">
            <div className="card login-card">
                <h1 className="login-title">Witaj ponownie</h1>
                <p className="login-subtitle">
                    Zaloguj się do swojego panelu zarządzania.
                </p>
                <LoginForm />
            </div>
        </main>
    );
};