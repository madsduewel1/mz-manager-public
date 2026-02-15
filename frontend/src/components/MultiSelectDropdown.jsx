import { useState, useRef, useEffect } from 'react';
import { FiChevronDown, FiCheck } from 'react-icons/fi';

function MultiSelectDropdown({ options, selected = [], onChange, label = 'Optionen wählen' }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [dropdownRef]);

    const toggleOption = (value) => {
        let newSelected;
        if (selected.includes(value)) {
            newSelected = selected.filter(item => item !== value);
        } else {
            newSelected = [...selected, value];
        }
        onChange(newSelected);
    };

    const getDisplayLabel = () => {
        if (!selected || selected.length === 0) return label;
        if (selected.length === 1) return selected[0];
        return `${selected.length} ausgewählt`; // Or join names if preferred
    };

    return (
        <div className="multi-select-container" ref={dropdownRef} style={{ position: 'relative' }}>
            <div
                className="form-input"
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'var(--color-bg-lighter)'
                }}
            >
                <span style={{
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    color: selected.length > 0 ? 'var(--color-text-primary)' : 'var(--color-text-secondary)'
                }}>
                    {selected.length > 0 ? selected.join(', ') : label}
                </span>
                <FiChevronDown />
            </div>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'var(--color-bg-medium)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    marginTop: '4px',
                    zIndex: 1000,
                    maxHeight: '200px',
                    overflowY: 'auto',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)'
                }}>
                    {options.map((option) => (
                        <div
                            key={option.value}
                            onClick={() => toggleOption(option.value)}
                            style={{
                                padding: '8px 12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                borderBottom: '1px solid var(--color-border)',
                                background: selected.includes(option.value) ? 'rgba(114, 137, 218, 0.1)' : 'transparent',
                                transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => !selected.includes(option.value) && (e.currentTarget.style.background = 'var(--color-bg-lighter)')}
                            onMouseLeave={(e) => !selected.includes(option.value) && (e.currentTarget.style.background = 'transparent')}
                        >
                            <div style={{
                                width: '16px',
                                height: '16px',
                                border: `1px solid ${selected.includes(option.value) ? 'var(--color-primary)' : 'var(--color-text-secondary)'}`,
                                borderRadius: '4px',
                                background: selected.includes(option.value) ? 'var(--color-primary)' : 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s'
                            }}>
                                {selected.includes(option.value) && <FiCheck size={12} color="white" />}
                            </div>
                            <span>{option.label}</span>
                        </div>
                    ))}
                    {options.length === 0 && (
                        <div style={{ padding: '8px 12px', color: 'var(--color-text-secondary)' }}>Keine Optionen</div>
                    )}
                </div>
            )}
        </div>
    );
}

export default MultiSelectDropdown;
