export const DashboardPage = () => {
    return (
        <div>
            <h2 className="dashboard-header">Twój Przegląd</h2>

            <div className="bento-grid">
                <div className="card bento-card-green">
                    <h3 className="bento-title">Wydatki z tego miesiąca</h3>
                    <div className="bento-value">0,00 PLN</div>
                    <p className="bento-desc">Moduł finansów w budowie</p>
                </div>

                <div className="card bento-card-pink">
                    <h3 className="bento-title">Aktywność Hobby</h3>
                    <div className="bento-value">86%</div>
                    <p className="bento-desc">Tygodniowego celu</p>
                </div>

                <div className="card">
                    <h3 className="bento-title-secondary">Nadchodzące zadania</h3>
                    <div className="task-list">
                        <div className="task-item">Zaplanuj budżet</div>
                        <div className="task-item">Dokończ aplikację</div>
                    </div>
                </div>
            </div>
        </div>
    );
};