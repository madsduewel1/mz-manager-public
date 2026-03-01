import { useState, useEffect, useRef } from 'react';
import {
    FiAlertCircle, FiSearch, FiFilter, FiUser, FiClock, FiMessageSquare,
    FiCheckCircle, FiXCircle, FiImage, FiMoreVertical, FiArchive,
    FiTrash2, FiExternalLink, FiSend, FiUserPlus, FiArrowRight, FiBox
} from 'react-icons/fi';
import { errorsAPI, authAPI } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';
import { useConfirmation } from '../contexts/ConfirmationContext';
import './ErrorReports.css';

function ErrorReports() {
    const [reports, setReports] = useState([]);
    const [eligibleUsers, setEligibleUsers] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedReport, setSelectedReport] = useState(null);
    const [feed, setFeed] = useState([]);
    const [comment, setComment] = useState('');
    const [filters, setFilters] = useState({
        status: '',
        priority: '',
        search: '',
        assigned_to: '',
        archived: false
    });
    const { success, error } = useNotification();
    const { confirm } = useConfirmation();
    const feedEndRef = useRef(null);

    useEffect(() => {
        loadData();
    }, [filters]);

    useEffect(() => {
        if (selectedReport) {
            loadFeed(selectedReport.id);
        }
    }, [selectedReport]);

    useEffect(() => {
        scrollToBottom();
    }, [feed]);

    const scrollToBottom = () => {
        feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const loadData = async () => {
        try {
            setLoading(true);
            const [reportsRes, usersRes, meRes] = await Promise.all([
                errorsAPI.getAll(filters),
                errorsAPI.getEligibleUsers(),
                authAPI.me()
            ]);
            setReports(reportsRes.data);
            setEligibleUsers(usersRes.data);
            setCurrentUser(meRes.data);
        } catch (err) {
            console.error('Error loading data:', err);
            error('Fehler beim Laden der Daten');
        } finally {
            setLoading(false);
        }
    };

    const loadFeed = async (id) => {
        try {
            const response = await errorsAPI.getFeed(id);
            setFeed(response.data);
        } catch (err) {
            console.error('Error loading feed:', err);
        }
    };

    const handleAction = async (id, data) => {
        try {
            await errorsAPI.update(id, data);
            success('Aktualisiert');
            loadData();
            if (selectedReport && selectedReport.id === id) {
                // Refresh local report data in modal
                const updatedReports = await errorsAPI.getAll(filters);
                const updated = updatedReports.data.find(r => r.id === id);
                setSelectedReport(updated);
                loadFeed(id);
            }
        } catch (err) {
            error('Fehler bei der Aktion');
        }
    };

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!comment.trim()) return;
        try {
            await errorsAPI.addComment(selectedReport.id, comment);
            setComment('');
            loadFeed(selectedReport.id);
        } catch (err) {
            error('Kommentar konnte nicht gesendet werden');
        }
    };

    const handleDelete = async (id) => {
        const isConfirmed = await confirm({
            title: 'Meldung endgültig löschen',
            message: 'Möchten Sie diese Fehlermeldung wirklich dauerhaft löschen? Diese Aktion kann nicht rückgängig gemacht werden.',
            confirmText: 'Löschen',
            type: 'danger'
        });

        if (!isConfirmed) return;

        try {
            await errorsAPI.delete(id);
            success('Gelöscht');
            setSelectedReport(null);
            loadData();
        } catch (err) {
            error('Fehler beim Löschen');
        }
    };

    const getPriorityColor = (p) => {
        switch (p) {
            case 'hoch': return 'priority-high';
            case 'mittel': return 'priority-medium';
            default: return 'priority-low';
        }
    };

    const getStatusInfo = (status) => {
        switch (status) {
            case 'offen': return { color: 'status-open', icon: <FiAlertCircle />, label: 'Offen' };
            case 'in_bearbeitung': return { color: 'status-progress', icon: <FiClock />, label: 'In Bearbeitung' };
            case 'erledigt': return { color: 'status-done', icon: <FiCheckCircle />, label: 'Erledigt' };
            case 'abgelehnt': return { color: 'status-rejected', icon: <FiXCircle />, label: 'Abgelehnt' };
            default: return { color: '', icon: null, label: status };
        }
    };

    return (
        <div className="error-reports-page">
            <header className="page-header">
                <div>
                    <h1>Fehlermeldungen</h1>
                    <p className="text-muted">Ticketsystem zur Behebung von gemeldeten Problemen</p>
                </div>
                <div className="header-actions">
                    <button
                        className={`btn ${filters.archived ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => setFilters(f => ({ ...f, archived: !f.archived }))}
                    >
                        <FiArchive /> {filters.archived ? 'Aktive anzeigen' : 'Archiv durchsuchen'}
                    </button>
                </div>
            </header>

            <div className="filter-bar card">
                <div className="search-input">
                    <FiSearch />
                    <input
                        type="text"
                        placeholder="Suchen nach Gerät, Beschreibung, Reporter..."
                        value={filters.search}
                        onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                    />
                </div>
                <div className="filter-group">
                    <select value={filters.status} onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}>
                        <option value="">Alle Status</option>
                        <option value="offen">Offen</option>
                        <option value="in_bearbeitung">In Bearbeitung</option>
                        <option value="erledigt">Erledigt</option>
                        <option value="abgelehnt">Abgelehnt</option>
                    </select>
                    <select value={filters.priority} onChange={(e) => setFilters(f => ({ ...f, priority: e.target.value }))}>
                        <option value="">Alle Prioritäten</option>
                        <option value="hoch">Hoch</option>
                        <option value="mittel">Mittel</option>
                        <option value="niedrig">Niedrig</option>
                    </select>
                    <select value={filters.assigned_to} onChange={(e) => setFilters(f => ({ ...f, assigned_to: e.target.value }))}>
                        <option value="">Alle Zuständigen</option>
                        <option value="none">Nicht zugewiesen</option>
                        {eligibleUsers.map(u => (
                            <option key={u.id} value={u.id}>{u.username} (Me)</option>
                        ))}
                    </select>
                </div>
            </div>

            {loading && reports.length === 0 ? (
                <div className="skeleton-container">
                    {[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton-row"></div>)}
                </div>
            ) : reports.length === 0 ? (
                <div className="empty-state card">
                    <FiAlertCircle className="empty-icon" />
                    <h3>Keine Meldungen gefunden</h3>
                    <p>Passe deine Filter an oder überprüfe das Archiv.</p>
                </div>
            ) : (
                <div className="reports-list-container card">
                    <div className="list-header">
                        <div className="col-id">ID</div>
                        <div className="col-status">Status</div>
                        <div className="col-priority">Prio</div>
                        <div className="col-asset">Betroffenes Gerät / Ort</div>
                        <div className="col-reporter">Reporter</div>
                        <div className="col-assignee">Zuständig</div>
                    </div>
                    <div className="reports-list">
                        {reports.map((report) => {
                            const statusInfo = getStatusInfo(report.status);
                            return (
                                <div
                                    key={report.id}
                                    className={`report-row ${selectedReport?.id === report.id ? 'active' : ''}`}
                                    onClick={() => setSelectedReport(report)}
                                >
                                    <div className="col-id">#{report.id}</div>
                                    <div className="col-status">
                                        <span className={`status-badge-mini ${statusInfo.color}`} title={statusInfo.label}>
                                            {statusInfo.icon}
                                        </span>
                                    </div>
                                    <div className="col-priority">
                                        <span className={`prio-dot ${getPriorityColor(report.priority)}`} title={`Priorität: ${report.priority}`}></span>
                                    </div>
                                    <div className="col-asset">
                                        <div className="asset-name">
                                            {report.asset_inventory || report.container_name || 'Allgemein'}
                                        </div>
                                        <div className="asset-sub">{report.asset_type || (report.container_id ? 'Container' : '-')}</div>
                                    </div>
                                    <div className="col-reporter">
                                        <FiUser /> {report.reporter_name || 'Anonym'}
                                    </div>
                                    <div className="col-assignee">
                                        {report.assigned_to_name ? (
                                            <span className="assignee-tag">@{report.assigned_to_name}</span>
                                        ) : (
                                            <span className="unassigned">-</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Modal Detail View */}
            {selectedReport && (
                <div className="modal-overlay" onClick={() => setSelectedReport(null)}>
                    <div className="modal-content ticket-detail" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="header-title-area">
                                <div className="ticket-id-badge">TICKET #{selectedReport.id}</div>
                                <h2>{selectedReport.asset_inventory || selectedReport.container_name || 'Allgemeine Meldung'}</h2>
                            </div>
                            <div className="header-actions-area">
                                <span className={`priority-tag ${getPriorityColor(selectedReport.priority)}`}>
                                    {selectedReport.priority}
                                </span>
                                <button className="close-btn" onClick={() => setSelectedReport(null)}>&times;</button>
                            </div>
                        </div>

                        <div className="ticket-meta-bar">
                            <div className="meta-item">
                                <FiUser />
                                <div>
                                    <label>Reporter</label>
                                    <span>{selectedReport.reporter_name || 'Anonym'}</span>
                                </div>
                            </div>
                            <div className="meta-item">
                                <FiClock />
                                <div>
                                    <label>Gemeldet am</label>
                                    <span>{new Date(selectedReport.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                                </div>
                            </div>
                            <div className="meta-item">
                                <FiBox />
                                <div>
                                    <label>Typ</label>
                                    <span>{selectedReport.asset_type || (selectedReport.container_id ? 'Container/Raum' : 'Sonstiges')}</span>
                                </div>
                            </div>
                            <div className={`status-pill ${getStatusInfo(selectedReport.status).color}`}>
                                {getStatusInfo(selectedReport.status).icon} {getStatusInfo(selectedReport.status).label}
                            </div>
                        </div>

                        <div className="ticket-layout">
                            <div className="ticket-main">
                                <section className="info-block">
                                    <h3><FiAlertCircle /> Problembeschreibung</h3>
                                    <div className="description-box">
                                        {selectedReport.description}
                                    </div>

                                    {selectedReport.photo_path && (
                                        <div className="photo-attachment">
                                            <h4><FiImage /> Anhänge</h4>
                                            <a href={`/uploads/${selectedReport.photo_path}`} target="_blank" rel="noreferrer" className="attachment-preview">
                                                <img src={`/uploads/${selectedReport.photo_path}`} alt="Anhang" />
                                                <div className="image-overlay"><FiExternalLink /> In neuem Tab öffnen</div>
                                            </a>
                                        </div>
                                    )}
                                </section>

                                <section className="activity-block">
                                    <h3><FiMessageSquare /> Aktivität & Verlauf</h3>
                                    <div className="feed-container">
                                        {feed.length === 0 ? (
                                            <div className="empty-feed">Noch keine Aktivitäten vorhanden.</div>
                                        ) : feed.map((item, i) => (
                                            <div key={i} className={`feed-item-wrapper ${item.is_system ? 'system-msg' : 'user-msg'}`}>
                                                {!item.is_system && (
                                                    <div className="user-avatar" title={item.username || 'Unbekannt'}>
                                                        {item.first_name ? item.first_name[0] : (item.username ? item.username[0].toUpperCase() : '?')}
                                                    </div>
                                                )}
                                                <div className="feed-bubble">
                                                    {!item.is_system && (
                                                        <div className="bubble-header">
                                                            <span className="user-name">
                                                                {item.first_name ? `${item.first_name} ${item.last_name || ''}` : (item.username || 'System-User')}
                                                            </span>
                                                            <span className="bubble-time">
                                                                {item.created_at ? new Date(item.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div className="bubble-text">{item.comment}</div>
                                                    {item.is_system && item.created_at && (
                                                        <span className="system-time">{new Date(item.created_at).toLocaleString('de-DE')}</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        <div ref={feedEndRef} />
                                    </div>
                                    <form className="comment-input-area" onSubmit={handleAddComment}>
                                        <input
                                            placeholder="Nachricht oder Notiz hinzufügen..."
                                            value={comment}
                                            onChange={e => setComment(e.target.value)}
                                        />
                                        <button type="submit" className="send-btn" disabled={!comment.trim()} title="Senden">
                                            <FiSend />
                                        </button>
                                    </form>
                                </section>
                            </div>

                            <div className="ticket-sidebar">
                                <div className="sidebar-section">
                                    <label className="section-label">Zuständigkeit</label>
                                    <div className="assignment-box">
                                        {!selectedReport.assigned_to ? (
                                            <button
                                                className="btn btn-primary btn-full take-btn"
                                                onClick={() => handleAction(selectedReport.id, { status: 'in_bearbeitung' })}
                                            >
                                                <FiUserPlus /> Ticket annehmen
                                            </button>
                                        ) : (
                                            <div className="current-assignee-info">
                                                <div className="assignee-avatar">
                                                    <FiUser />
                                                </div>
                                                <div className="assignee-details">
                                                    <span className="label">Zugewiesen an</span>
                                                    <span className="name">{selectedReport.assigned_to_name}</span>
                                                </div>
                                            </div>
                                        )}

                                        <div className="transfer-area">
                                            <label>Zuweisung ändern</label>
                                            <select
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    handleAction(selectedReport.id, { assigned_to: val === "" ? null : parseInt(val) });
                                                }}
                                                value={selectedReport.assigned_to || ''}
                                                className="form-select modern-select"
                                            >
                                                <option value="">{selectedReport.assigned_to ? 'Zuständigkeit entfernen' : 'Benutzer wählen...'}</option>
                                                {eligibleUsers.map(u => (
                                                    <option key={u.id} value={u.id}>
                                                        {u.first_name ? `${u.first_name} ${u.last_name || ''}` : u.username}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="sidebar-section">
                                    <label className="section-label">Status & Priorität</label>
                                    <div className="status-controls">
                                        <div className="control-group">
                                            <label>Status</label>
                                            <select
                                                value={selectedReport.status}
                                                onChange={(e) => handleAction(selectedReport.id, { status: e.target.value })}
                                                className="modern-select"
                                            >
                                                <option value="offen">Offen</option>
                                                <option value="in_bearbeitung">In Bearbeitung</option>
                                                <option value="erledigt">Erledigt</option>
                                                <option value="abgelehnt">Abgelehnt</option>
                                            </select>
                                        </div>
                                        <div className="control-group">
                                            <label>Priorität</label>
                                            <select
                                                value={selectedReport.priority}
                                                onChange={(e) => handleAction(selectedReport.id, { priority: e.target.value })}
                                                className="modern-select"
                                            >
                                                <option value="hoch">Hoch</option>
                                                <option value="mittel">Mittel</option>
                                                <option value="niedrig">Niedrig</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="sidebar-actions-footer">
                                    {!selectedReport.archived_at ? (
                                        <button
                                            className="btn btn-secondary btn-full"
                                            onClick={() => handleAction(selectedReport.id, { archived: true })}
                                        >
                                            <FiArchive /> Ticket archivieren
                                        </button>
                                    ) : (
                                        <button
                                            className="btn btn-secondary btn-full"
                                            onClick={() => handleAction(selectedReport.id, { archived: false })}
                                        >
                                            <FiArrowRight /> Reaktivieren
                                        </button>
                                    )}
                                    <button
                                        className="btn btn-danger btn-full btn-ghost"
                                        onClick={() => handleDelete(selectedReport.id)}
                                    >
                                        <FiTrash2 /> Endgültig löschen
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ErrorReports;
