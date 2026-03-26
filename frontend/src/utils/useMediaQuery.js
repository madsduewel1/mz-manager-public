import { useState, useEffect } from 'react';

/**
 * Custom hook to detect screen size and device type
 */
const useMediaQuery = () => {
    const [device, setDevice] = useState({
        isMobile: window.innerWidth < 768,
        isTablet: window.innerWidth >= 768 && window.innerWidth < 1200,
        isDesktop: window.innerWidth >= 1200,
        width: window.innerWidth,
        isTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
        orientation: window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
    });

    useEffect(() => {
        const handleResize = () => {
            setDevice({
                isMobile: window.innerWidth < 768,
                isTablet: window.innerWidth >= 768 && window.innerWidth < 1200,
                isDesktop: window.innerWidth >= 1200,
                width: window.innerWidth,
                isTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
                orientation: window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
            });
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return device;
};

export default useMediaQuery;
