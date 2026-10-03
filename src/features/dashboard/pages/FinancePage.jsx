import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { pl } from 'date-fns/locale/pl';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import '../styles/dashboard.css';

registerLocale('pl', pl);

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
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="custom-select-container" ref={selectRef}>
            <div className="input-field custom-select-header" onClick={() => setIsOpen(!isOpen)}>
        <span style={{ color: value ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
          {value || placeholder}
        </span>
                <span style={{ fontSize: '10px' }}>{isOpen ? '▲' : '▼'}</span>
            </div>
            {isOpen && (
                <div className="custom-select-list">
                    {options.map(opt => (
                        <div key={opt} className="custom-select-item" onClick={() => { onChange(opt); setIsOpen(false); }}>
                            {opt}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export const FinancePage = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [user, setUser] = useState(null);

    const [monthYear, setMonthYear] = useState(() => {
        const today = new Date();
        return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    });

    const [income, setIncome] = useState('');
    const [budgets, setBudgets] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [credits, setCredits] = useState([]);

    const [newBudget, setNewBudget] = useState({ category: '', amount: '' });
    const [newTx, setNewTx] = useState({ date: new Date().toISOString().split('T')[0], category: '', amount: '', description: '' });
    const [newCredit, setNewCredit] = useState({ purpose: '', bank: '', amount: '', installments: '' });

    const [editingBudget, setEditingBudget] = useState(null);
    const [editValues, setEditValues] = useState({ category: '', amount: '' });

    const [editingTx, setEditingTx] = useState(null);
    const [editTxValues, setEditTxValues] = useState({ date: '', category: '', amount: '', description: '' });

    const [editingCredit, setEditingCredit] = useState(null);
    const [editCreditValues, setEditCreditValues] = useState({ purpose: '', bank: '', amount: '', installments: '' });

    const fetchData = async (currentUser) => {
        if (!currentUser) return;

        const { data: incomeData } = await supabase.from('monthly_incomes').select('amount').eq('user_id', currentUser.id).eq('month_year', monthYear).single();
        setIncome(incomeData?.amount || '');

        const { data: budgetData } = await supabase.from('budgets').select('*').eq('user_id', currentUser.id).eq('month_year', monthYear).order('category', { ascending: true });
        setBudgets(budgetData || []);

        const startOfMonth = `${monthYear}-01`;
        const endOfMonth = `${monthYear}-31`;
        const { data: txData } = await supabase.from('transactions').select('*').eq('user_id', currentUser.id).gte('transaction_date', startOfMonth).lte('transaction_date', endOfMonth).order('transaction_date', { ascending: false });
        setTransactions(txData || []);

        const { data: creditsData } = await supabase.from('credits').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false });
        setCredits(creditsData || []);
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
        setEditingBudget(null);
        setEditingTx(null);
        setEditingCredit(null);
    }, [monthYear]);

    const saveIncome = async () => {
        if (!income) return;
        await supabase.from('monthly_incomes').upsert({ user_id: user.id, month_year: monthYear, amount: parseFloat(income) }, { onConflict: 'user_id, month_year' });
        alert('Przychód zapisany');
    };
    const addBudgetCategory = async (e) => {
        e.preventDefault();
        if (!newBudget.category || !newBudget.amount) return;
        await supabase.from('budgets').insert({ user_id: user.id, month_year: monthYear, category: newBudget.category, planned_amount: parseFloat(newBudget.amount) });
        setNewBudget({ category: '', amount: '' });
        fetchData(user);
    };
    const saveEditBudget = async (id) => {
        if (!editValues.category || !editValues.amount) return;
        await supabase.from('budgets').update({ category: editValues.category, planned_amount: parseFloat(editValues.amount) }).eq('id', id);
        setEditingBudget(null);
        fetchData(user);
    };
    const deleteBudget = async (id) => {
        if (window.confirm('Na pewno chcesz usunąć tę kategorię?')) {
            await supabase.from('budgets').delete().eq('id', id);
            fetchData(user);
        }
    };

    const addTransaction = async (e) => {
        e.preventDefault();
        if (!newTx.category || !newTx.amount || !newTx.date) return;
        await supabase.from('transactions').insert({ user_id: user.id, transaction_date: newTx.date, category: newTx.category, amount: parseFloat(newTx.amount), description: newTx.description });
        setNewTx({ ...newTx, amount: '', description: '' });
        fetchData(user);
    };
    const saveEditTx = async (id) => {
        if (!editTxValues.category || !editTxValues.amount || !editTxValues.date) return;
        await supabase.from('transactions').update({ transaction_date: editTxValues.date, category: editTxValues.category, amount: parseFloat(editTxValues.amount), description: editTxValues.description }).eq('id', id);
        setEditingTx(null);
        fetchData(user);
    };
    const deleteTx = async (id) => {
        if (window.confirm('Na pewno chcesz usunąć ten wydatek?')) {
            await supabase.from('transactions').delete().eq('id', id);
            fetchData(user);
        }
    };

    const addCredit = async (e) => {
        e.preventDefault();
        if (!newCredit.purpose || !newCredit.bank || !newCredit.amount || !newCredit.installments) return;
        await supabase.from('credits').insert({ user_id: user.id, purpose: newCredit.purpose, bank: newCredit.bank, total_amount: parseFloat(newCredit.amount), installments_count: parseInt(newCredit.installments) });
        setNewCredit({ purpose: '', bank: '', amount: '', installments: '' });
        fetchData(user);
    };
    const saveEditCredit = async (id) => {
        if (!editCreditValues.purpose || !editCreditValues.bank || !editCreditValues.amount || !editCreditValues.installments) return;
        await supabase.from('credits').update({
            purpose: editCreditValues.purpose,
            bank: editCreditValues.bank,
            total_amount: parseFloat(editCreditValues.amount),
            installments_count: parseInt(editCreditValues.installments)
        }).eq('id', id);
        setEditingCredit(null);
        fetchData(user);
    };
    const deleteCredit = async (id) => {
        if (window.confirm('Na pewno chcesz usunąć ten kredyt z listy?')) {
            await supabase.from('credits').delete().eq('id', id);
            fetchData(user);
        }
    };
    const payInstallment = async (id, currentPaid, total) => {
        if (currentPaid >= total) return;
        await supabase.from('credits').update({ paid_installments: currentPaid + 1 }).eq('id', id);
        fetchData(user);
    };
    const undoInstallment = async (id, currentPaid) => {
        if (currentPaid <= 0) return;
        await supabase.from('credits').update({ paid_installments: currentPaid - 1 }).eq('id', id);
        fetchData(user);
    };

    const calculateSpent = (category) => transactions.filter(tx => tx.category === category).reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
    const totalPlanned = budgets.reduce((sum, b) => sum + parseFloat(b.planned_amount), 0);
    const totalSpent = transactions.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
    const unassignedIncome = parseFloat(income || 0) - totalPlanned;

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#a28CFE', '#FF6B6B', '#4BC0C0', '#36A2EB'];
    const pieData = budgets.map(b => ({
        name: b.category,
        value: Math.max(calculateSpent(b.category), 0)
    })).filter(d => d.value > 0);

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
                        dateFormat="LLLL yyyy"
                        showMonthYearPicker
                        onChangeRaw={(e) => e.preventDefault()}
                        className="input-field"
                        style={{ textTransform: 'capitalize' }}
                    />
                </div>
            </div>

            <div className="finance-tabs" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', WebkitOverflowScrolling: 'touch' }}>
                <button className="btn-primary" onClick={() => setActiveTab('overview')} style={{ opacity: activeTab === 'overview' ? 1 : 0.5, whiteSpace: 'nowrap' }}>Widok 1: Główny</button>
                <button className="btn-primary" onClick={() => setActiveTab('plan')} style={{ opacity: activeTab === 'plan' ? 1 : 0.5, whiteSpace: 'nowrap' }}>Widok 2: Plan i kategorie</button>
                <button className="btn-primary" onClick={() => setActiveTab('transactions')} style={{ opacity: activeTab === 'transactions' ? 1 : 0.5, whiteSpace: 'nowrap' }}>Widok 3: Dodaj transakcję</button>
                <button className="btn-primary" onClick={() => setActiveTab('credits')} style={{ opacity: activeTab === 'credits' ? 1 : 0.5, whiteSpace: 'nowrap' }}>Widok 4: Kredyty</button>
            </div>

            {activeTab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    <div className="card">
                        <h3 className="bento-title">Udział kategorii w wydatkach</h3>
                        {pieData.length > 0 ? (
                            <div style={{ width: '100%', height: 'auto' }}>
                                <div style={{ width: '100%', height: '250px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none">
                                                {pieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                {/* Zwiększony margines górny i dodany margines dolny, aby odsunąć legendę od krawędzi */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', marginTop: '16px', marginBottom: '24px' }}>
                                    {pieData.map((entry, index) => (
                                        <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: COLORS[index % COLORS.length] }}></div>
                                            {entry.name}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px 0' }}>Brak wydatków w tym miesiącu.</p>
                        )}
                    </div>

                    <div className="card">
                        <h3 className="bento-title">Wykorzystanie budżetu</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {budgets.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>Brak zaplanowanych kategorii.</p> : null}
                            {budgets.map(b => {
                                const spent = calculateSpent(b.category);
                                const percentage = b.planned_amount > 0 ? Math.min((Math.max(spent, 0) / b.planned_amount) * 100, 100) : 0;
                                const remaining = b.planned_amount - spent;

                                let barColor = 'var(--accent-green)';
                                if (percentage >= 80 && percentage < 100) barColor = '#FFBB28';
                                if (spent > b.planned_amount) barColor = '#ff6b6b';

                                return (
                                    <div key={b.id}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                                            <strong>{b.category}</strong>
                                            <span style={{ color: remaining >= 0 ? 'var(--text-secondary)' : '#ff6b6b' }}>
                        {remaining >= 0 ? `Zostało: ${remaining.toFixed(2)} zł` : `Przekroczono o: ${Math.abs(remaining).toFixed(2)} zł`}
                      </span>
                                        </div>
                                        <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-input)', borderRadius: '4px', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${percentage}%`, backgroundColor: barColor, transition: 'width 0.3s ease' }}></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="card">
                        <h3 className="bento-title">Postęp spłaty rat</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {credits.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>Brak aktywnych kredytów.</p> : null}
                            {credits.map(c => {
                                const paid = c.paid_installments || 0;
                                const remaining = c.installments_count - paid;

                                return (
                                    <div key={c.id}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                            <div>
                                                <strong style={{ fontSize: '14px' }}>{c.purpose} ({c.bank})</strong>
                                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                    Spłacono: {paid} z {c.installments_count} rat (zostało {remaining})
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap', width: '100%' }}>
                                            {Array.from({ length: c.installments_count }).map((_, i) => (
                                                <div key={i} style={{
                                                    height: '8px', flex: '1 1 0', minWidth: '4px',
                                                    backgroundColor: i < paid ? 'var(--accent-green)' : 'var(--bg-input)',
                                                    borderRadius: '2px'
                                                }} title={`Rata ${i + 1}`} />
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                </div>
            )}

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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div className="card">
                        <h3 className="bento-title">Dodaj nowy wydatek lub przychód</h3>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                            Wpisz kwotę na minusie (np. -100), aby dodać zwrot pieniędzy.
                        </p>
                        <form onSubmit={addTransaction}>
                            <div className="form-group">
                                <label>Data</label>
                                <DatePicker
                                    locale="pl" dateFormat="yyyy-MM-dd"
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
                                    value={newTx.category} onChange={(val) => setNewTx({...newTx, category: val})}
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
                            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '12px' }}>Zapisz</button>
                        </form>
                    </div>

                    <div className="card">
                        <h3 className="bento-title">Historia z tego miesiąca</h3>
                        <h2 style={{ marginBottom: '16px' }}>
                            Bilans wydatków: {totalSpent > 0 ? `-${totalSpent.toFixed(2)}` : `+${Math.abs(totalSpent).toFixed(2)}`} PLN
                        </h2>
                        <div className="task-list" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                            {transactions.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>Brak transakcji</p> : null}
                            {transactions.map(tx => {
                                const isEditing = editingTx === tx.id;
                                const amountNum = parseFloat(tx.amount);
                                const isIncome = amountNum < 0;
                                return isEditing ? (
                                    <div key={tx.id} className="task-item" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--bg-input)', borderRadius: '8px' }}>
                                        <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>Edytuj transakcję</h4>
                                        <div className="form-group">
                                            <label>Data</label>
                                            <DatePicker locale="pl" dateFormat="yyyy-MM-dd" selected={editTxValues.date ? new Date(editTxValues.date) : new Date()} onChange={(date) => setEditTxValues({...editTxValues, date: date.toISOString().split('T')[0]})} onChangeRaw={(e) => e.preventDefault()} className="input-field" />
                                        </div>
                                        <div className="form-group">
                                            <label>Kategoria</label>
                                            <CustomSelect placeholder="Kategoria" value={editTxValues.category} onChange={(val) => setEditTxValues({...editTxValues, category: val})} options={budgets.map(b => b.category)} />
                                        </div>
                                        <div className="form-group">
                                            <label>Kwota (PLN)</label>
                                            <input type="number" step="0.01" className="input-field" value={editTxValues.amount} onChange={e => setEditTxValues({...editTxValues, amount: e.target.value})} />
                                        </div>
                                        <div className="form-group">
                                            <label>Komentarz</label>
                                            <input type="text" className="input-field" placeholder="Komentarz" value={editTxValues.description} onChange={e => setEditTxValues({...editTxValues, description: e.target.value})} />
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                            <button onClick={() => saveEditTx(tx.id)} className="btn-primary" style={{ padding: '10px', fontSize: '14px', flex: 1 }}>Zapisz zmiany</button>
                                            <button onClick={() => setEditingTx(null)} className="btn-primary" style={{ padding: '10px', fontSize: '14px', backgroundColor: 'var(--bg-input)', flex: 1 }}>Anuluj</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div key={tx.id} className="task-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <strong>{tx.category}</strong>
                                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{tx.transaction_date} {tx.description && `• ${tx.description}`}</div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                            <div style={{ color: isIncome ? 'var(--accent-green)' : '#ff6b6b', fontWeight: 'bold' }}>{isIncome ? '+' : '-'}{Math.abs(amountNum).toFixed(2)} zł</div>
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                <button onClick={() => { setEditingTx(tx.id); setEditTxValues({ date: tx.transaction_date, category: tx.category, amount: tx.amount, description: tx.description || '' }); }} className="btn-primary" style={{ padding: '6px 10px', fontSize: '11px', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)' }}>Edytuj</button>
                                                <button onClick={() => deleteTx(tx.id)} className="btn-primary" style={{ padding: '6px 10px', fontSize: '11px', backgroundColor: '#ff4d4d', color: '#fff' }}>Usuń</button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'credits' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div className="card">
                        <h3 className="bento-title">Dodaj nowy kredyt / pożyczkę</h3>
                        <form onSubmit={addCredit}>
                            <div className="form-group">
                                <label>Na co? (np. Samochód, Sprzęt)</label>
                                <input type="text" className="input-field" value={newCredit.purpose} onChange={e => setNewCredit({...newCredit, purpose: e.target.value})} required />
                            </div>
                            <div className="form-group">
                                <label>Bank lub instytucja</label>
                                <input type="text" className="input-field" value={newCredit.bank} onChange={e => setNewCredit({...newCredit, bank: e.target.value})} required />
                            </div>
                            <div className="form-group">
                                <label>Całkowita kwota zadłużenia (PLN)</label>
                                <input type="number" step="0.01" className="input-field" value={newCredit.amount} onChange={e => setNewCredit({...newCredit, amount: e.target.value})} required />
                            </div>
                            <div className="form-group">
                                <label>Ilość rat</label>
                                <input type="number" className="input-field" value={newCredit.installments} onChange={e => setNewCredit({...newCredit, installments: e.target.value})} required />
                            </div>
                            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '12px' }}>Zapisz kredyt</button>
                        </form>
                    </div>

                    <div className="card">
                        <h3 className="bento-title">Zarządzaj aktywnymi zobowiązaniami</h3>
                        <div className="task-list" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                            {credits.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>Brak zapisanych kredytów</p> : null}
                            {credits.map(c => {
                                const paid = c.paid_installments || 0;
                                const monthlyInstallment = c.total_amount / c.installments_count;
                                const isEditing = editingCredit === c.id;

                                return isEditing ? (
                                    <div key={c.id} className="task-item" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--bg-input)', borderRadius: '8px' }}>
                                        <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>Edytuj dane kredytu</h4>
                                        <div className="form-group">
                                            <label>Na co?</label>
                                            <input type="text" className="input-field" value={editCreditValues.purpose} onChange={e => setEditCreditValues({...editCreditValues, purpose: e.target.value})} />
                                        </div>
                                        <div className="form-group">
                                            <label>Bank</label>
                                            <input type="text" className="input-field" value={editCreditValues.bank} onChange={e => setEditCreditValues({...editCreditValues, bank: e.target.value})} />
                                        </div>
                                        <div className="form-group">
                                            <label>Całkowita kwota (PLN)</label>
                                            <input type="number" step="0.01" className="input-field" value={editCreditValues.amount} onChange={e => setEditCreditValues({...editCreditValues, amount: e.target.value})} />
                                        </div>
                                        <div className="form-group">
                                            <label>Ilość rat</label>
                                            <input type="number" className="input-field" value={editCreditValues.installments} onChange={e => setEditCreditValues({...editCreditValues, installments: e.target.value})} />
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                            <button onClick={() => saveEditCredit(c.id)} className="btn-primary" style={{ padding: '10px', fontSize: '14px', flex: 1 }}>Zapisz zmiany</button>
                                            <button onClick={() => setEditingCredit(null)} className="btn-primary" style={{ padding: '10px', fontSize: '14px', backgroundColor: 'var(--bg-input)', flex: 1 }}>Anuluj</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div key={c.id} className="task-item" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div>
                                                <strong style={{ fontSize: '15px' }}>{c.purpose}</strong>
                                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Bank: {c.bank} • {c.installments_count} rat</div>
                                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>Spłacono: {paid} rat</div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ color: '#ff6b6b', fontWeight: 'bold' }}>-{monthlyInstallment.toFixed(2)} zł / mc</div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>z {c.total_amount.toFixed(2)} zł</div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end', marginTop: '4px' }}>
                                            <button
                                                onClick={() => undoInstallment(c.id, paid)}
                                                disabled={paid <= 0}
                                                className="btn-primary"
                                                style={{ padding: '6px 10px', fontSize: '11px', backgroundColor: paid <= 0 ? 'transparent' : 'var(--bg-input)', color: paid <= 0 ? 'var(--text-secondary)' : 'var(--text-primary)', border: paid <= 0 ? '1px solid var(--bg-input)' : 'none' }}>
                                                Cofnij
                                            </button>
                                            <button
                                                onClick={() => payInstallment(c.id, paid, c.installments_count)}
                                                disabled={paid >= c.installments_count}
                                                className="btn-primary"
                                                style={{ padding: '6px 10px', fontSize: '11px', backgroundColor: paid >= c.installments_count ? 'transparent' : 'var(--bg-input)', color: paid >= c.installments_count ? 'var(--text-secondary)' : 'var(--text-primary)', border: paid >= c.installments_count ? '1px solid var(--bg-input)' : 'none' }}>
                                                Spłać ratę
                                            </button>
                                            <button
                                                onClick={() => { setEditingCredit(c.id); setEditCreditValues({ purpose: c.purpose, bank: c.bank, amount: c.total_amount, installments: c.installments_count }); }}
                                                className="btn-primary"
                                                style={{ padding: '6px 10px', fontSize: '11px', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)' }}>
                                                Edytuj
                                            </button>
                                            <button
                                                onClick={() => deleteCredit(c.id)}
                                                className="btn-primary"
                                                style={{ padding: '6px 10px', fontSize: '11px', backgroundColor: '#ff4d4d', color: '#fff' }}>
                                                Usuń
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};