// public/sw.js
try {
    importScripts('/uv/uv.bundle.js');
    importScripts('/uv/uv.config.js');
    importScripts('/uv/uv.sw.js');

    if (typeof UVServiceWorker !== 'undefined') {
        const sw = new UVServiceWorker();
        self.addEventListener('fetch', (event) => {
            event.respondWith(sw.fetch(event));
        });
    } else {
        console.error('UVServiceWorker is not defined. Check if uv.sw.js is loaded correctly.');
    }
} catch (e) {
    console.error('Service Worker Evaluation Error:', e);
}
