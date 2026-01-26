document.addEventListener('DOMContentLoaded', () => {
    if (window.SolarSystemWebGL && typeof window.SolarSystemWebGL.init === 'function') {
        window.SolarSystemWebGL.init().catch((error) => {
            console.error(error);
            alert('Failed to start the solar system simulation. Check the console for details.');
        });
    } else {
        console.error('SolarSystemWebGL init not found.');
    }
});
