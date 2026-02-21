import { Link, useLocation } from 'react-router-dom';
import { FiChevronRight, FiHome } from 'react-icons/fi';

const Breadcrumbs = () => {
    const location = useLocation();
    const pathnames = location.pathname.split('/').filter((x) => x);

    // Map routes to professional labels
    const routeLabels = {
        'dashboard': 'Dashboard',
        'assets': 'Geräte',
        'containers': 'Container',
        'lendings': 'Ausleihen',
        'error-reports': 'Fehlermeldungen',
        'admin': 'Verwaltung',
        'users': 'Benutzer',
        'roles': 'Rellen',
        'rooms': 'Räume',
        'models': 'Gerätemodelle',
        'qr-codes': 'QR-Codes',
        'logs': 'System-Logs'
    };

    if (pathnames.length === 0) return null;

    return (
        <nav className="breadcrumbs" aria-label="Breadcrumb">
            <Link to="/dashboard" className="breadcrumb-item">
                <FiHome size={14} />
            </Link>
            {pathnames.map((value, index) => {
                const last = index === pathnames.length - 1;
                const to = `/${pathnames.slice(0, index + 1).join('/')}`;
                const label = routeLabels[value] || value.charAt(0).toUpperCase() + value.slice(1);

                return (
                    <div key={to} className="breadcrumb-group">
                        <FiChevronRight className="breadcrumb-separator" size={14} />
                        {last ? (
                            <span className="breadcrumb-current">{label}</span>
                        ) : (
                            <Link to={to} className="breadcrumb-item">
                                {label}
                            </Link>
                        )}
                    </div>
                );
            })}
        </nav>
    );
};

export default Breadcrumbs;
