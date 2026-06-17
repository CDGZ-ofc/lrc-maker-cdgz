export async function unregister() {
    if ("serviceWorker" in navigator) {
        await caches.keys().then(async (cacheNames) => {
            return Promise.all(
                cacheNames
                    .map(async (cacheName) => {
                        return caches.delete(cacheName);
                    }),
            );
        });

        await navigator.serviceWorker.getRegistration().then((registration) => {
            if (registration) {
                void registration.unregister().then(() => {
                    location.reload();
                });
            }
        });
    }
}
