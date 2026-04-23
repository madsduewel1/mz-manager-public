export const availablePermissions = [
    // Geräte
    'assets.view', 'assets.create', 'assets.edit', 'assets.delete', 'assets.history',
    // Container
    'containers.view', 'containers.create', 'containers.edit', 'containers.delete',
    // Fehlermeldungen
    'errors.view', 'errors.create', 'errors.edit', 'errors.delete',
    // Ausleihe
    'lendings.view', 'lendings.create', 'lendings.return', 'lendings.delete',
    // Benutzer
    'users.view', 'users.create', 'users.edit', 'users.delete',
    // Rollen
    'roles.view', 'roles.create', 'roles.edit', 'roles.delete',
    // Gerätemodelle
    'models.view', 'models.create', 'models.edit', 'models.delete',
    // Räume
    'rooms.view', 'rooms.create', 'rooms.edit', 'rooms.delete',
    // Sonstiges
    'qr.print', 'logs.view',
    // Netzwerk
    'network.view', 'network.edit', 'network.admin',
    // Zubehör (NEU)
    'accessories.manage'
];

export const permissionLabels = {
    // Geräte
    'assets.view': 'Geräte ansehen',
    'assets.create': 'Geräte hinzufügen',
    'assets.edit': 'Geräte bearbeiten',
    'assets.delete': 'Geräte löschen',
    'assets.history': 'Geräteverlauf einsehen',
    // Container
    'containers.view': 'Container ansehen',
    'containers.create': 'Container erstellen',
    'containers.edit': 'Container bearbeiten',
    'containers.delete': 'Container löschen',
    // Fehlermeldungen
    'errors.view': 'Fehlermeldungen ansehen',
    'errors.create': 'Fehlermeldungen melden',
    'errors.edit': 'Fehlermeldungen bearbeiten',
    'errors.delete': 'Fehlermeldungen löschen',
    // Ausleihe
    'lendings.view': 'Ausleihen ansehen',
    'lendings.create': 'Ausleihen erstellen',
    'lendings.return': 'Ausleihen zurücknehmen',
    'lendings.delete': 'Ausleihen löschen',
    // Benutzer
    'users.view': 'Benutzer ansehen',
    'users.create': 'Benutzer erstellen',
    'users.edit': 'Benutzer bearbeiten',
    'users.delete': 'Benutzer löschen',
    // Rollen
    'roles.view': 'Rollen ansehen',
    'roles.create': 'Rollen erstellen',
    'roles.edit': 'Rollen bearbeiten',
    'roles.delete': 'Rollen löschen',
    // Gerätemodelle
    'models.view': 'Gerätemodelle ansehen',
    'models.create': 'Gerätemodelle erstellen',
    'models.edit': 'Gerätemodelle bearbeiten',
    'models.delete': 'Gerätemodelle löschen',
    // Räume
    'rooms.view': 'Räume ansehen',
    'rooms.create': 'Räume erstellen',
    'rooms.edit': 'Räume bearbeiten',
    'rooms.delete': 'Räume löschen',
    // Sonstiges
    'qr.print': 'QR-Codes drucken',
    'logs.view': 'Systemlogs einsehen',
    // Netzwerk
    'network.view': 'Netzwerk ansehen',
    'network.edit': 'Netzwerk bearbeiten',
    'network.admin': 'Netzwerk verwalten (VLANs anlegen/löschen)',
    // Zubehör (NEU)
    'accessories.manage': 'Zubehör verwalten'
};

export const permissionGroups = [
    {
        name: 'Geräte & Inventar',
        perms: ['assets.view', 'assets.create', 'assets.edit', 'assets.delete', 'assets.history']
    },
    {
        name: 'Gerätemodelle & Räume',
        perms: ['models.view', 'models.create', 'models.edit', 'models.delete', 'rooms.view', 'rooms.create', 'rooms.edit', 'rooms.delete']
    },
    {
        name: 'Container',
        perms: ['containers.view', 'containers.create', 'containers.edit', 'containers.delete']
    },
    {
        name: 'Ausleihe',
        perms: ['lendings.view', 'lendings.create', 'lendings.return', 'lendings.delete']
    },
    {
        name: 'Fehlermeldungen',
        perms: ['errors.view', 'errors.create', 'errors.edit', 'errors.delete']
    },
    {
        name: 'Benutzer & Rollen',
        perms: ['users.view', 'users.create', 'users.edit', 'users.delete', 'roles.view', 'roles.create', 'roles.edit', 'roles.delete']
    },
    {
        name: 'Netzwerk',
        perms: ['network.view', 'network.edit', 'network.admin']
    },
    {
        name: 'Zubehör (NEU)',
        perms: ['accessories.manage']
    },
    {
        name: 'Sonstiges',
        perms: ['qr.print', 'logs.view']
    }
];

export const getRoleBadgeClass = (roleName) => {
    const lower = (roleName || '').toLowerCase();
    if (lower === 'administrator' || lower === 'admin') return 'badge-danger';
    if (lower === 'mediencoach') return 'badge-warning';
    if (lower === 'lehrer') return 'badge-info';
    if (lower === 'schüler' || lower === 'schueler') return 'badge-success';
    return 'badge-info';
};
