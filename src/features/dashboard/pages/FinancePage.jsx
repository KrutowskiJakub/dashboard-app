import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { pl } from 'date-fns/locale/pl';
import '../styles/dashboard.css';

// Rejestrujemy polski język dla kalendarza
registerLocale('pl', pl);

// Nasz własny komponent listy rozwijanej z detekcją kliknięcia poza nim
const CustomSelect = ({ value, onChange, options, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (selectRef.current && !selectRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <div className="custom-select-container" ref={selectRef}>
            <div
                className="input-field custom-select-header"
                onClick={() => setIsOpen(!isOpen)}
            >
        <span style={{ color: value ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
          {value || placeholder}
        </span>
                <span style={{ fontSize: '10px' }}>{isOpen ? '▲' : '▼'}</span>
            </div>
            {isOpen && (
                <div className="custom-select-list">
                    {options.map(opt => (
                        <div
                            key={opt}
                            className="custom-select-item"
                            onClick={() => { onChange(opt); setIsOpen(false); }}
                        >
                            {opt}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export const FinancePage = () => {
    const [activeTab, setActiveTab] = useState('plan');
    const [user, setUser] = useState(null);

    // Dane z bazy
    const [monthYear, setMonthYear] = useState(() => {
        const today = new Date();
        return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    });
    const [income, setIncome] = useState('');
    const [budgets, setBudgets] = useState([]);
    const [transactions, setTransactions] = useState([]);

    // Formularze i stan edycji
    const [newBudget, setNewBudget] = useState({ category: '', amount: '' });
    const [newTx, setNewTx] = useState({ date: new Date().toISOString().split('T')[0], category: '', amount: '', description: '' });
    const [editingBudget, setEditingBudget] = useState(null);
    const [editValues, setEditValues] = useState({ category: '', amount: '' });

    // Pobieranie danych
    const fetchData = async (currentUser) => {
        if (!currentUser) return;

        const { data: incomeData } = await supabase
            .from('monthly_incomes')
            .select('amount')
            .eq('user_id', currentUser.id)
            .eq('month_year', monthYear)
            .single();
        setIncome(incomeData?.amount || '');

        const { data: budgetData } = await supabase
            .from('budgets')
            .select('*')
            .eq('user_id', currentUser.id)
            .eq('month_year', monthYear)
            .order('category', { ascending: true });
        setBudgets(budgetData || []);

        const startOfMonth = `${monthYear}-01`;
        const endOfMonth = `${monthYear}-31`;
        const { data: txData } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', currentUser.id)
            .gte('transaction_date', startOfMonth)
            .lte('transaction_date', endOfMonth)
            .order('transaction_date', { ascending: false });
        setTransactions(txData || []);
    };

    useEffect(() => {
        const getUserAndData = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setUser(session.user);
                fetchData(session.user);
            }
        };
        getUserAndData();
        // Resetuj stan edycji przy zmianie miesiąca
        setEditingBudget(null);
    }, [monthYear]);

    // --- AKCJE ZAPISU DO BAZY ---
    const saveIncome = async () => {
        if (!income) return;
        await supabase.from('monthly_incomes').upsert({
            user_id: user.id,
            month_year: monthYear,
            amount: parseFloat(income)
        }, { onConflict: 'user_id, month_year' });
        alert('Przychód zapisany');
    };

    const addBudgetCategory = async (e) => {
        e.preventDefault();
        if (!newBudget.category || !newBudget.amount) return;

        await supabase.from('budgets').insert({
            user_id: user.id,
            month_year: monthYear,
            category: newBudget.category,
            planned_amount: parseFloat(newBudget.amount)
        });

        setNewBudget({ category: '', amount: '' });
        fetchData(user);
    };

    const saveEditBudget = async (id) => {
        if (!editValues.category || !editValues.amount) return;
        await supabase.from('budgets').update({
            category: editValues.category,
            planned_amount: parseFloat(editValues.amount)
        }).eq('id', id);

        setEditingBudget(null);
        fetchData(user);
    };

    const deleteBudget = async (id) => {
        if (window.confirm('Na pewno chcesz usunąć tę kategorię? Nie wpłynie to na już dodane transakcje.')) {
            await supabase.from('budgets').delete().eq('id', id);
            fetchData(user);
        }
    };

    const addTransaction = async (e) => {
        e.preventDefault();
        if (!newTx.category || !newTx.amount || !newTx.date) return;

        await supabase.from('transactions').insert({
            user_id: user.id,
            transaction_date: newTx.date,
            category: newTx.category,
            amount: parseFloat(newTx.amount),
            description: newTx.description
        });

        setNewTx({ ...newTx, amount: '', description: '' });
        fetchData(user);
    };

    // --- OBLICZENIA ---
    const calculateSpent = (category) => {
        return transactions
            .filter(tx => tx.category === category)
            .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
    };

    const totalPlanned = budgets.reduce((sum, b) => sum + parseFloat(b.planned_amount), 0);
    const totalSpent = transactions.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
    const unassignedIncome = parseFloat(income || 0) - totalPlanned;

    return (
        <div>
            <div className="finance-header">
                <h2 className="dashboard-header" style={{ marginBottom: 0 }}>Twoje Finanse</h2>
                <div className="month-picker-container">
                    <DatePicker
                        locale="pl"
                        selected={new Date(`${monthYear}-01`)}
                        onChange={(date) => {
                            const yyyy = date.getFullYear();
                            const mm = String(date.getMonth() + 1).padStart(2, '0');
                            setMonthYear(`${yyyy}-${mm}`);
                        }}
                        dateFormat="LLLL yyyy" /* <--- ZMIANA TUTAJ (L zamiast M) */
                        showMonthYearPicker
                        onChangeRaw={(e) => e.preventDefault()}
                        className="input-field"
                        style={{ textTransform: 'capitalize' }} /* Dodajemy to, by pierwsza litera była wielka, np. "Październik 2026" */
                    />
                </div>
            </div>

            <div className="finance-tabs">
                <button className="btn-primary" onClick={() => setActiveTab('plan')} style={{ opacity: activeTab === 'plan' ? 1 : 0.5 }}>Widok 1: Plan i kategorie</button>
                <button className="btn-primary" onClick={() => setActiveTab('transactions')} style={{ opacity: activeTab === 'transactions' ? 1 : 0.5 }}>Widok 2: Dodaj transakcję</button>
            </div>

            {activeTab === 'plan' && (
                <div className="bento-grid">
                    <div className="card">
                        <h3 className="bento-title">Zarządzanie przychodem</h3>
                        <div className="form-group">
                            <label>Przychód w tym miesiącu (PLN)</label>
                            <div className="action-row">
                                <input type="number" className="input-field" value={income} onChange={(e) => setIncome(e.target.value)} />
                                <button className="btn-primary" onClick={saveIncome}>Zapisz</button>
                            </div>
                        </div>
                        <div style={{ marginTop: '16px' }}>
                            <p style={{ color: 'var(--text-secondary)' }}>Nieprzypisane środki:</p>
                            <h2 style={{ color: unassignedIncome >= 0 ? 'var(--accent-green)' : '#ff6b6b' }}>{unassignedIncome.toFixed(2)} PLN</h2>
                        </div>
                    </div>

                    <div className="card" style={{ gridColumn: '1 / -1' }}>
                        <h3 className="bento-title">Kategorie i realizacja budżetu</h3>
                        <form onSubmit={addBudgetCategory} className="action-row" style={{ marginBottom: '24px' }}>
                            <input type="text" className="input-field" placeholder="Kategoria" value={newBudget.category} onChange={e => setNewBudget({...newBudget, category: e.target.value})} required />
                            <input type="number" className="input-field" placeholder="Kwota" value={newBudget.amount} onChange={e => setNewBudget({...newBudget, amount: e.target.value})} required />
                            <button type="submit" className="btn-primary">Dodaj</button>
                        </form>

                        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', minWidth: '600px' }}>
                                <thead>
                                <tr style={{ borderBottom: '1px solid var(--bg-input)' }}>
                                    <th style={{ padding: '12px' }}>Kategoria</th>
                                    <th>Planowane</th>
                                    <th>Wydano</th>
                                    <th>Zostało</th>
                                    <th>Akcje</th>
                                </tr>
                                </thead>
                                <tbody>
                                {budgets.map(b => {
                                    const spent = calculateSpent(b.category);
                                    const remaining = b.planned_amount - spent;
                                    const isEditing = editingBudget === b.id;

                                    return (
                                        <tr key={b.id} style={{ borderBottom: '1px solid var(--bg-input)' }}>
                                            <td style={{ padding: '12px' }}>
                                                {isEditing ? <input type="text" className="input-field" style={{ padding: '6px' }} value={editValues.category} onChange={e => setEditValues({...editValues, category: e.target.value})} /> : b.category}
                                            </td>
                                            <td>
                                                {isEditing ? <input type="number" className="input-field" style={{ padding: '6px', width: '100px' }} value={editValues.amount} onChange={e => setEditValues({...editValues, amount: e.target.value})} /> : `${b.planned_amount.toFixed(2)} zł`}
                                            </td>
                                            <td>{spent.toFixed(2)} zł</td>
                                            <td style={{ color: remaining >= 0 ? 'var(--accent-green)' : '#ff6b6b' }}>{remaining.toFixed(2)} zł</td>
                                            <td>
                                                {isEditing ? (
                                                    <div style={{ display: 'flex', gap: '6px' }}>
                                                        <button onClick={() => saveEditBudget(b.id)} className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }}>Zapisz</button>
                                                        <button onClick={() => setEditingBudget(null)} className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: 'var(--bg-input)' }}>Anuluj</button>
                                                    </div>
                                                ) : (
                                                    <div style={{ display: 'flex', gap: '6px' }}>
                                                        <button onClick={() => { setEditingBudget(b.id); setEditValues({ category: b.category, amount: b.planned_amount }); }} className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)' }}>Edytuj</button>
                                                        <button onClick={() => deleteBudget(b.id)} className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: '#ff4d4d', color: '#fff' }}>Usuń</button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'transactions' && (
                <div className="bento-grid">
                    <div className="card">
                        <h3 className="bento-title">Dodaj nowy wydatek</h3>
                        <form onSubmit={addTransaction}>
                            <div className="form-group">
                                <label>Data</label>
                                <DatePicker
                                    locale="pl"
                                    dateFormat="yyyy-MM-dd"
                                    selected={newTx.date ? new Date(newTx.date) : new Date()}
                                    onChange={(date) => setNewTx({...newTx, date: date.toISOString().split('T')[0]})}
                                    onChangeRaw={(e) => e.preventDefault()}
                                    className="input-field"
                                />
                            </div>
                            <div className="form-group">
                                <label>Kategoria</label>
                                <CustomSelect
                                    placeholder="Wybierz kategorię z planu"
                                    value={newTx.category}
                                    onChange={(val) => setNewTx({...newTx, category: val})}
                                    options={budgets.map(b => b.category)}
                                />
                            </div>
                            <div className="form-group">
                                <label>Kwota (PLN)</label>
                                <input type="number" step="0.01" className="input-field" value={newTx.amount} onChange={e => setNewTx({...newTx, amount: e.target.value})} required />
                            </div>
                            <div className="form-group">
                                <label>Komentarz (opcjonalnie)</label>
                                <input type="text" className="input-field" value={newTx.description} onChange={e => setNewTx({...newTx, description: e.target.value})} />
                            </div>
                            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '12px' }}>Zapisz wydatek</button>
                        </form>
                    </div>

                    <div className="card">
                        <h3 className="bento-title">Historia z tego miesiąca</h3>
                        <h2 style={{ marginBottom: '16px' }}>Suma wydatków: {totalSpent.toFixed(2)} PLN</h2>
                        <div className="task-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            {transactions.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>Brak transakcji</p> : null}
                            {transactions.map(tx => (
                                <div key={tx.id} className="task-item" style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <div>
                                        <strong>{tx.category}</strong>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{tx.transaction_date} {tx.description && `• ${tx.description}`}</div>
                                    </div>
                                    <div style={{ color: '#ff6b6b', fontWeight: 'bold' }}>-{tx.amount} zł</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};