import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';

export const LoginForm = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [errorMsg, setErrorMsg] = useState(''); // Przechowywanie błędów z serwera

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg('');

        // Wysłanie żądania autoryzacji do Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
            email: formData.email,
            password: formData.password,
        });

        if (error) {
            setErrorMsg(error.message); // Wyświetlenie błędu (np. zły e-mail)
            return;
        }

        console.log('Zalogowano pomyślnie! Obiekt sesji:', data);
        navigate('/dashboard');
    };

    return (
        <form onSubmit={handleSubmit}>
            {errorMsg && <p style={{ color: 'red' }}>{errorMsg}</p>}

            <div>
                <label htmlFor="email">Email: </label>
                <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required />
            </div>
            <div>
                <label htmlFor="password">Hasło: </label>
                <input type="password" id="password" name="password" value={formData.password} onChange={handleChange} required />
            </div>
            <button type="submit">Zaloguj się</button>
        </form>
    );
};