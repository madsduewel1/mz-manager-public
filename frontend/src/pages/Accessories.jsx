import { useState, useEffect, useCallback } from 'react';
import {
    FiPlus, FiTrash2, FiEdit2, FiSearch,
    FiFilter, FiDownload, FiMonitor, FiCpu, FiX, FiCheck
} from 'react-icons/fi';
import { accessoriesAPI, assetsAPI } from '../services/api';
import { hasPermission } from '../utils/auth';
import { useNotification } from '../contexts/NotificationContext';
import { useConfirmation } from '../contexts/ConfirmationContext';
import Modal from '../components/Modal';

/* ─── Helpers ─────────────────────────────────────────────── */
const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    useEffect(() => {
        const handler = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
    }, []);
    return isMobile;
};

const CATEGORY_COLORS = {
    'Kabel': '#3b82f6',
    'Adapter': '#f97316',
    'Maus': '#10b981',
    'Tastatur': '#8b5cf6',
    'Netzteil': '#ef4444',
    'Tasche': '#f59e0b',
    'Monitor': '#06b6d4'
};
const DEFAULT_COLOR = 'var(--color-border)';

function getCategoryColor(category) {
    return CATEGORY_COLORS[category] || DEFAULT_COLOR;
}

function getStatusBadgeClass(status) {
    switch (status) {
        case 'ok': return 'badge-success';
        case 'defekt': return 'badge-danger';
        case 'in_reparatur': return 'badge-warning';
        case 'fehlt': return 'badge-danger';
        default: return 'badge-outline';
    }
}

/* ─── Accessory Card (Mobile) ─────────────────────────────── */
function AccessoryCard({ item, onEdit, onDelete, canManage }) {
    const accentColor = getCategoryColor(item.category);

    return (
        <div style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            borderLeft: `4px solid ${accentColor}`,
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
        }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span style={{ color: accentColor, fontSize: '20px' }}><FiCpu /></span>
                    <div>
                        <div style={{ fontWeight: 600, fontSize: '15px' }}>{item.name}</div>
                        <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span className="badge badge-outline" style={{ fontSize: '10px' }}>{item.category}</span>
                            {item.inventory_number && <code>{item.inventory_number}</code>}
                        </div>
                    </div>
                </div>
                <span className={`badge ${getStatusBadgeClass(item.status)}`}>
                    {item.status}
                </span>
            </div>

            {/* Details Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: '13px', borderTop: '1px solid var(--color-border-light)', paddingTop: '12px' }}>
                <div>
                    <div style={{ color: 'var(--color-text-secondary)', fontSize: '11px', textTransform: 'uppercase', marginBottom: '2px' }}>Menge</div>
                    <span style={{ fontWeight: item.quantity > 0 ? 600 : 400 }}>{item.quantity}x</span>
                </div>
                <div>
                    <div style={{ color: 'var(--color-text-secondary)', fontSize: '11px', textTransform: 'uppercase', marginBottom: '2px' }}>Standort</div>
                    <span>{item.location || '-'}</span>
                </div>
                {item.assigned_device_id && (
                    <div style={{ gridColumn: '1/-1' }}>
                        <div style={{ color: 'var(--color-text-secondary)', fontSize: '11px', textTransform: 'uppercase', marginBottom: '2px' }}>Zugeordnetes Gerät</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <FiMonitor size={12} color="var(--color-text-tertiary)" />
                            <span>{item.assigned_device_model || item.assigned_device_type}</span>
                            <code style={{ fontSize: '11px' }}>{item.assigned_device_inventory}</code>
                        </div>
                    </div>
                )}
                {item.serial_number && (
                    <div style={{ gridColumn: '1/-1' }}>
                        <div style={{ color: 'var(--color-text-secondary)', fontSize: '11px', textTransform: 'uppercase', marginBottom: '2px' }}>Seriennummer</div>
                        <code style={{ fontSize: '12px' }}>{item.serial_number}</code>
                    </div>
                )}
            </div>

            {/* Actions */}
            {canManage && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <button
                        className="btn btn-secondary"
                        style={{ flex: 1, minHeight: '44px', justifyContent: 'center' }}
                        onClick={() => onEdit(item)}
                    >
                        <FiEdit2 size={14} /> Bearbeiten
                    </button>
                    <button
                        className="btn btn-secondary"
                        style={{ minHeight: '44px', width: '44px', padding: 0, justifyContent: 'center', color: 'var(--color-error)', borderColor: 'var(--color-error)' }}
                        onClick={() => onDelete(item)}
                    >
                        <FiTrash2 size={14} />
                    </button>
                </div>
            )}
        </div>
    );
}

/* ─── Filter Modal (Mobile) ───────────────────────────────── */
function FilterModal({ isOpen, onClose, categories, categoryFilter, setCategoryFilter, statusFilter, setStatusFilter, searchTerm, setSearchTerm }) {
    if (!isOpen) return null;
    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-end'
        }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={onClose} />
            <div style={{
                position: 'relative', background: 'var(--card-bg)',
                borderRadius: '16px 16px 0 0', padding: '20px',
                maxHeight: '80vh', overflowY: 'auto'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0 }}>Filter</h3>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}><FiX /></button>
                </div>

                <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label className="form-label">Suche</label>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Name, Inventarnummer, Seriennummer..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label className="form-label">Kategorie</label>
                    <select
                        className="form-select"
                        value={categoryFilter}
                        onChange={e => setCategoryFilter(e.target.value)}
                    >
                        <option value="all">Alle Kategorien</option>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>

                <div className="form-group" style={{ marginBottom: '24px' }}>
                    <label className="form-label">Zustand</label>
                    <select
                        className="form-select"
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                    >
                        <option value="all">Alle Zustände</option>
                        <option value="ok">Ok</option>
                        <option value="defekt">Defekt</option>
                        <option value="in_reparatur">In Reparatur</option>
                        <option value="fehlt">Fehlt</option>
                    </select>
                </div>

                <button
                    className="btn btn-primary"
                    style={{ width: '100%', minHeight: '48px', justifyContent: 'center' }}
                    onClick={onClose}
                >
                    Filter anwenden
                </button>
            </div>
        </div>
    );
}

/* ─── Main Component ──────────────────────────────────────── */
function Accessories() {
    const isMobile = useIsMobile();
    const canManage = hasPermission('accessories.manage');

    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [showFilterModal, setShowFilterModal] = useState(false);

    // Form Modal
    const [showFormModal, setShowFormModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const initialFormState = {
        name: '', category: '', inventory_number: '', serial_number: '',
        quantity: 1, status: 'ok', location: '', assigned_device_id: '', notes: ''
    };
    const [formData, setFormData] = useState(initialFormState);

    const { success, error: notifyError } = useNotification();
    const { confirm } = useConfirmation();

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [itemsRes, catRes, devicesRes] = await Promise.all([
                accessoriesAPI.getAccessories(),
                accessoriesAPI.getCategories(),
                assetsAPI.getAll()
            ]);
            setItems(itemsRes.data);
            setCategories(catRes.data);
            setDevices(devicesRes.data || []);
        } catch (err) {
            notifyError(err.response?.data?.error || 'Fehler beim Laden des Zubehörs');
        } finally {
            setLoading(false);
        }
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingItem) {
                await accessoriesAPI.updateAccessory(editingItem.id, formData);
                success('Zubehör aktualisiert');
            } else {
                await accessoriesAPI.createAccessory(formData);
                success('Zubehör hinzugefügt');
            }
            setShowFormModal(false);
            loadData();
        } catch (err) {
            notifyError(err.response?.data?.error || 'Fehler beim Speichern');
        }
    };

    const handleDelete = async (item) => {
        const confirmed = await confirm({
            title: 'Zubehör löschen',
            message: `Möchtest du das Zubehör "${item.name}" wirklich löschen?`,
            confirmLabel: 'Löschen',
            confirmVariant: 'danger'
        });
        if (confirmed) {
            try {
                await accessoriesAPI.deleteAccessory(item.id);
                success('Zubehör gelöscht');
                loadData();
            } catch (err) {
                notifyError(err.response?.data?.error || 'Fehler beim Löschen');
            }
        }
    };

    const openFormModal = (item = null) => {
        if (item) {
            setEditingItem(item);
            setFormData({
                name: item.name || '',
                category: item.category || '',
                inventory_number: item.inventory_number || '',
                serial_number: item.serial_number || '',
                quantity: item.quantity,
                status: item.status || 'ok',
                location: item.location || '',
                assigned_device_id: item.assigned_device_id || '',
                notes: item.notes || ''
            });
        } else {
            setEditingItem(null);
            setFormData(initialFormState);
        }
        setShowFormModal(true);
    };

    const filteredItems = items.filter(i => {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
            i.name.toLowerCase().includes(searchLower) ||
            (i.inventory_number || '').toLowerCase().includes(searchLower) ||
            (i.serial_number || '').toLowerCase().includes(searchLower) ||
            (i.location || '').toLowerCase().includes(searchLower);

        const matchesCategory = categoryFilter === 'all' || i.category === categoryFilter;
        const matchesStatus = statusFilter === 'all' || i.status === statusFilter;

        return matchesSearch && matchesCategory && matchesStatus;
    });

    const exportCSV = () => {
        const headers = ['Bezeichnung', 'Kategorie', 'Inventarnummer', 'Seriennummer', 'Menge', 'Zustand', 'Standort', 'Zugeordnetes Gerät', 'Notizen'];
        const rows = filteredItems.map(i => [
            i.name, i.category, i.inventory_number || '', i.serial_number || '', i.quantity,
            i.status, i.location || '',
            i.assigned_device_model ? `${i.assigned_device_model} (${i.assigned_device_inventory})` : '',
            i.notes || ''
        ]);
        const csv = [headers, ...rows].map(e => e.join(';')).join('\n');
        const link = document.createElement('a');
        link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
        link.download = `zubehoer_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    const activeFiltersCount = (categoryFilter !== 'all' ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0) + (searchTerm ? 1 : 0);

    if (loading) return <div className="loading">Zubehör wird geladen...</div>;

    return (
        <div className="container">
            {/* Header */}
            <div className="page-header" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px'
            }}>
                <div>
                    <h1 style={{ margin: 0 }}>Zubehör</h1>
                    {!isMobile && <p className="text-muted">Kabel, Adapter, Mäuse und weiteres Equipment verwalten</p>}
                </div>
                {canManage && (
                    <button className="btn btn-primary" onClick={() => openFormModal()}>
                        <FiPlus /> Zubehör hinzufügen
                    </button>
                )}
            </div>

            {/* Toolbar */}
            <div className="toolbar" style={{
                display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap'
            }}>
                {isMobile ? (
                    <button
                        className="btn btn-secondary"
                        onClick={() => setShowFilterModal(true)}
                        style={{ flex: 1, minHeight: '44px', justifyContent: 'center' }}
                    >
                        <FiFilter /> Filter {activeFiltersCount > 0 && `(${activeFiltersCount})`}
                    </button>
                ) : (
                    <>
                        <div className="search-wrapper" style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
                            <FiSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Zubehör suchen..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                style={{ paddingLeft: '36px' }}
                            />
                        </div>
                        <select
                            className="form-select"
                            value={categoryFilter}
                            onChange={e => setCategoryFilter(e.target.value)}
                            style={{ width: '180px' }}
                        >
                            <option value="all">Alle Kategorien</option>
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select
                            className="form-select"
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            style={{ width: '150px' }}
                        >
                            <option value="all">Alle Zustände</option>
                            <option value="ok">Ok</option>
                            <option value="defekt">Defekt</option>
                            <option value="in_reparatur">In Rep.</option>
                            <option value="fehlt">Fehlt</option>
                        </select>
                    </>
                )}
                <button
                    className="btn btn-secondary btn-icon"
                    onClick={exportCSV}
                    title="CSV Export"
                    style={{ minHeight: isMobile ? '44px' : 'auto' }}
                >
                    <FiDownload />
                </button>
            </div>

            {/* Active Filters Display (Mobile) */}
            {isMobile && activeFiltersCount > 0 && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                    {searchTerm && (
                        <div className="badge badge-outline" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px' }}>
                            Suche: {searchTerm}
                            <FiX onClick={() => setSearchTerm('')} style={{ cursor: 'pointer' }} />
                        </div>
                    )}
                    {categoryFilter !== 'all' && (
                        <div className="badge badge-outline" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px' }}>
                            Kat: {categoryFilter}
                            <FiX onClick={() => setCategoryFilter('all')} style={{ cursor: 'pointer' }} />
                        </div>
                    )}
                    {statusFilter !== 'all' && (
                        <div className="badge badge-outline" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px' }}>
                            Zustand: {statusFilter}
                            <FiX onClick={() => setStatusFilter('all')} style={{ cursor: 'pointer' }} />
                        </div>
                    )}
                </div>
            )}

            {/* Content Display */}
            <div className="card p-0" style={{ background: isMobile ? 'transparent' : 'var(--card-bg)', border: isMobile ? 'none' : undefined, boxShadow: isMobile ? 'none' : undefined }}>
                {filteredItems.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                        <FiCpu size={40} style={{ opacity: 0.2, marginBottom: '16px' }} />
                        <p>Kein Zubehör gefunden.</p>
                    </div>
                ) : isMobile ? (
                    // MOBILE LAYOUT
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {filteredItems.map(item => (
                            <AccessoryCard
                                key={item.id}
                                item={item}
                                canManage={canManage}
                                onEdit={openFormModal}
                                onDelete={handleDelete}
                            />
                        ))}
                    </div>
                ) : (
                    // DESKTOP LAYOUT
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Kategorie</th>
                                <th>Bestand</th>
                                <th>Zustand</th>
                                <th>Standort & Notizen</th>
                                <th>Zugeordnetes Gerät</th>
                                {canManage && <th style={{ textAlign: 'right' }}>Aktionen</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredItems.map(item => (
                                <tr key={item.id}>
                                    <td>
                                        <div style={{ fontWeight: 600 }}>{item.name}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', display: 'flex', gap: '8px' }}>
                                            {item.inventory_number && <span>Inv: {item.inventory_number}</span>}
                                            {item.serial_number && <span>SN: {item.serial_number}</span>}
                                        </div>
                                    </td>
                                    <td><span className="badge badge-outline">{item.category}</span></td>
                                    <td><strong>{item.quantity}x</strong></td>
                                    <td><span className={`badge ${getStatusBadgeClass(item.status)}`}>{item.status}</span></td>
                                    <td>
                                        <div>{item.location || '-'}</div>
                                        {item.notes && <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>{item.notes}</div>}
                                    </td>
                                    <td>
                                        {item.assigned_device_id ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <FiMonitor size={14} color="var(--color-text-tertiary)" />
                                                <div style={{ fontSize: '13px' }}>
                                                    {item.assigned_device_model || item.assigned_device_type}
                                                    <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>{item.assigned_device_inventory}</div>
                                                </div>
                                            </div>
                                        ) : (
                                            <span style={{ color: 'var(--color-text-tertiary)' }}>-</span>
                                        )}
                                    </td>
                                    {canManage && (
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                <button className="btn btn-secondary btn-icon" onClick={() => openFormModal(item)} title="Bearbeiten">
                                                    <FiEdit2 size={14} />
                                                </button>
                                                <button className="btn btn-secondary btn-icon" style={{ color: 'var(--color-error)' }} onClick={() => handleDelete(item)} title="Löschen">
                                                    <FiTrash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Mobile Filter Modal */}
            <FilterModal
                isOpen={showFilterModal}
                onClose={() => setShowFilterModal(false)}
                categories={categories}
                categoryFilter={categoryFilter}
                setCategoryFilter={setCategoryFilter}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
            />

            {/* Add/Edit Form Modal */}
            <Modal
                isOpen={showFormModal}
                onClose={() => setShowFormModal(false)}
                title={editingItem ? 'Zubehör bearbeiten' : 'Zubehör hinzufügen'}
                maxWidth="500px"
            >
                <form onSubmit={handleFormSubmit}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                        gap: isMobile ? '0' : '16px'
                    }}>
                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label className="form-label">Bezeichnung *</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Kategorie *</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                                placeholder="z.B. Kabel, Adapter..."
                                list="category-options"
                                required
                            />
                            <datalist id="category-options">
                                {categories.map(c => <option key={c} value={c} />)}
                                {Object.keys(CATEGORY_COLORS).map(c => !categories.includes(c) && <option key={c} value={c} />)}
                            </datalist>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Menge *</label>
                            <input
                                type="number"
                                className="form-input"
                                value={formData.quantity}
                                onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                                min="0" inputMode="numeric"
                                required
                            />
                        </div>

                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <div style={{ display: 'flex', gap: '16px' }}>
                                <div style={{ flex: 1 }}>
                                    <label className="form-label">Inventarnummer</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.inventory_number}
                                        onChange={e => setFormData({ ...formData, inventory_number: e.target.value })}
                                        placeholder="Optional"
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label className="form-label">Seriennummer</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.serial_number}
                                        onChange={e => setFormData({ ...formData, serial_number: e.target.value })}
                                        placeholder="Optional"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Standort</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.location}
                                onChange={e => setFormData({ ...formData, location: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Zustand</label>
                            <select
                                className="form-select"
                                value={formData.status}
                                onChange={e => setFormData({ ...formData, status: e.target.value })}
                            >
                                <option value="ok">Ok</option>
                                <option value="defekt">Defekt</option>
                                <option value="in_reparatur">In Reparatur</option>
                                <option value="fehlt">Fehlt</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Zugeordnetes Gerät</label>
                            <select
                                className="form-select"
                                value={formData.assigned_device_id || ''}
                                onChange={e => setFormData({ ...formData, assigned_device_id: e.target.value })}
                            >
                                <option value="">- Kein Gerät -</option>
                                {devices.map(d => (
                                    <option key={d.id} value={d.id}>
                                        {d.model || d.type} {d.inventory_number ? `(${d.inventory_number})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label className="form-label">Notizen</label>
                            <textarea
                                className="form-textarea"
                                rows="3"
                                value={formData.notes}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
                        <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowFormModal(false)}>
                            Abbrechen
                        </button>
                        <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                            Speichern
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

export default Accessories;
