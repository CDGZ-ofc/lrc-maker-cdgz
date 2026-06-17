if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").then(
        (registration) => {
            // Registration was successful
            console.log("ServiceWorker Registed (｡･ω･｡)ﾉ: ", registration.scope);

            // Check for updates immediately
            registration.update();

            // Listen for updates
            registration.addEventListener("updatefound", () => {
                const newWorker = registration.installing;
                if (newWorker) {
                    newWorker.addEventListener("statechange", () => {
                        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                            // New content is available, show update prompt
                            window.dispatchEvent(new CustomEvent("swUpdateAvailable"));
                        }
                    });
                }
            });

            // Periodically check for updates (every 15 minutes)
            setInterval(() => {
                registration.update();
            }, 15 * 60 * 1000);
        },
        (err) => {
            // registration failed :(
            console.log("ServiceWorker registration failed ( ꒪﹃ ꒪) ", err);
        },
    );

    // Listen for controller change to reload if needed
    navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (window.swUpdateReloadRequested) {
            window.location.reload();
        }
    });
}
