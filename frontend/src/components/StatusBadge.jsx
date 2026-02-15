import { FiCheckCircle, FiXCircle, FiTool } from 'react-icons/fi';

function StatusBadge({ status }) {
    const statusConfig = {
        ok: {
            icon: <FiCheckCircle />,
            className: 'badge-ok',
            label: 'OK'
        },
        defekt: {
            icon: <FiXCircle />,
            className: 'badge-defekt',
            label: 'Defekt'
        },
        in_reparatur: {
            icon: <FiTool />,
            className: 'badge-reparatur',
            label: 'In Reparatur'
        },
        ausgemustert: {
            icon: <FiXCircle />,
            className: 'badge',
            label: 'Ausgemustert'
        }
    };

    const config = statusConfig[status] || statusConfig.ok;

    return (
        <span className={`badge ${config.className}`}>
            {config.icon}
            {config.label}
        </span>
    );
}

export default StatusBadge;
