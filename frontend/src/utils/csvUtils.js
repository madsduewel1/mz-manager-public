export const validHeadersPerType = {
    assets: ['inventory_number', 'type', 'model', 'manufacturer', 'serial_number', 'container_name', 'status', 'notes'],
    containers: ['name', 'type', 'description', 'parent_container_name', 'building', 'floor', 'room_number', 'capacity'],
    models: ['manufacturer', 'model_name', 'type', 'description'],
    rooms: ['name', 'building', 'floor', 'capacity']
};

/**
 * Simple CSV Parser
 * @param {string} text - The CSV string
 * @param {string} importType - The type of import ('assets', 'containers', etc.) to filter valid columns
 * @returns {Array<Object>} - Array of objects representing the rows
 */
export const parseCSV = (text, importType) => {
    // Detect separator (comma or semicolon)
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) return [];

    const separator = lines[0].includes(';') ? ';' : ',';
    const rawHeaders = lines[0].split(separator).map(h => h.trim());
    
    // Normalize headers to snake_case for DB compatibility
    const headerMap = {
        'inventarnummer': 'inventory_number',
        'typ': 'type',
        'modell': 'model',
        'hersteller': 'manufacturer',
        'seriennummer': 'serial_number',
        'container': 'container_name',
        'status': 'status',
        'kaufdatum': 'purchase_date',
        'garantie': 'warranty_until',
        'notizen': 'notes',
        'name': 'name',
        'beschreibung': 'description',
        'eltern_container': 'parent_container_name',
        'eltern_container_name': 'parent_container_name',
        'gebäude': 'building',
        'etage': 'floor',
        'raum_nummer': 'room_number',
        'kapazität': 'capacity',
        'modellname': 'model_name'
    };

    const headers = rawHeaders.map(h => headerMap[h.toLowerCase()] || h.toLowerCase().replace(/\s+/g, '_'));
    const validKeys = importType ? validHeadersPerType[importType] : null;

    return lines.slice(1).map(line => {
        // Simple CSV splitter that ignores separators within quotes
        const values = line.split(separator);
        const obj = {};
        let hasData = false;

        headers.forEach((header, index) => {
            if (validKeys && !validKeys.includes(header)) return; // Skip invalid/unnecessary columns
            
            let val = values[index] ? values[index].trim() : '';
            // Handle quotes
            if (val.startsWith('"') && val.endsWith('"')) {
                val = val.substring(1, val.length - 1);
            }
            if (val !== '') hasData = true;
            obj[header] = val;
        });

        return hasData ? obj : null;
    }).filter(row => row !== null);
};

/**
 * Reverse Map for Displaying German Headers in UI
 */
export const internalToGerman = {
    'inventory_number': 'Inventarnummer',
    'type': 'Typ',
    'model': 'Modell',
    'manufacturer': 'Hersteller',
    'serial_number': 'Seriennummer',
    'container_name': 'Container',
    'status': 'Status',
    'purchase_date': 'Kaufdatum',
    'warranty_until': 'Garantie bis',
    'notes': 'Notizen',
    'name': 'Name',
    'description': 'Beschreibung',
    'parent_container_name': 'Eltern- Container',
    'building': 'Gebäude',
    'floor': 'Etage',
    'room_number': 'Raum- Nummer',
    'capacity': 'Kapazität',
    'model_name': 'Modellname'
};

/**
 * Download a CSV Template
 * @param {string} type - 'assets', 'containers', 'models', 'rooms'
 */
export const downloadTemplate = (type) => {
    let headers = [];
    let filename = '';

    switch (type) {
        case 'assets':
            headers = ['Inventarnummer', 'Typ', 'Modell', 'Hersteller', 'Seriennummer', 'Container', 'Status', 'Notizen'];
            filename = 'vorlage_geraete.csv';
            break;
        case 'containers':
            headers = ['Name', 'Typ', 'Beschreibung', 'Eltern- Container', 'Gebäude', 'Etage', 'Raum- Nummer', 'Kapazität'];
            filename = 'vorlage_container.csv';
            break;
        case 'models':
            headers = ['Hersteller', 'Modellname', 'Typ', 'Beschreibung'];
            filename = 'vorlage_modelle.csv';
            break;
        case 'rooms':
            headers = ['Name', 'Gebäude', 'Etage', 'Kapazität'];
            filename = 'vorlage_raeume.csv';
            break;
        default:
            return;
    }

    const csvContent = headers.join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
