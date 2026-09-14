import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';

export const LoginForm = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [errorMsg, setErrorMsg] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        const { error } = await supabase.auth.signInWithPassword({
            email: formData.email,
            password: formData.password,
        });

        if (error) {
            setErrorMsg(error.message);
            return;
        }
        navigate('/dashboard');
    };

    return (
        <form onSubmit={handleSubmit}>
            {errorMsg && <p className="error-message">{errorMsg}</p>}

            <div className="form-group">
                <label htmlFor="email">Email</label>
                <input className="input-field" type="email" id="email" name="email" value={formData.email} onChange={handleChange} required />
            </div>
            <div className="form-group">
                <label htmlFor="password">Hasło</label>
                <input className="input-field" type="password" id="password" name="password" value={formData.password} onChange={handleChange} required />
            </div>
            <button type="submit" className="btn-primary login-btn">
                Zaloguj się
            </button>
        </form>
    );
};