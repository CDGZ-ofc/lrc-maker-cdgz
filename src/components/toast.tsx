import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPubSub } from "../utils/pubsub.js";
import { appContext } from "./app.context.js";
import { CheckSVG, InfoSVG, ProblemSVG } from "./svg.js";

type MessageType = "info" | "success" | "warning";

interface IMessage {
    type: MessageType;
    text: string;
}

export const toastPubSub = createPubSub<IMessage>();

const box = { id: 0 };

export const Toast: React.FC = () => {
    const self = useRef(Symbol(Toast.name));
    const { lang } = useContext(appContext);

    interface IToast extends IMessage {
        id: number;
    }

    const [toastQueue, setToastQueue] = useState<IToast[]>([]);

    useEffect(() => {
        return toastPubSub.sub(self.current, (data) => {
            setToastQueue((queue) => [{ id: box.id++, ...data }, ...queue]);
        });
    }, []);

    // Listen for Service Worker update events
    useEffect(() => {
        const handleSWUpdate = () => {
            // Use confirm dialog instead of custom toast with reload button
            if (confirm(lang.notify.updateAvailable)) {
                // Set flag to indicate reload is requested
                (window as any).swUpdateReloadRequested = true;

                // Send message to service worker to skip waiting and activate immediately
                if (navigator.serviceWorker.controller) {
                    navigator.serviceWorker.controller.postMessage({ action: "skipWaiting" });
                }
            }
        };

        window.addEventListener("swUpdateAvailable", handleSWUpdate);
        return () => window.removeEventListener("swUpdateAvailable", handleSWUpdate);
    }, [lang]);

    const onAnimationEnd = useCallback((ev: React.AnimationEvent<HTMLElement>) => {
        if (ev.animationName === "slide-out-right") {
            setToastQueue((queue) => queue.slice(0, -1));
        }
    }, []);

    const removeToast = useCallback((id: number) => {
        setToastQueue((queue) => queue.filter((toast) => toast.id !== id));
    }, []);

    const ToastIter = useCallback((toast: IToast) => {
        const badge = {
            info: <InfoSVG />,
            success: <CheckSVG />,
            warning: <ProblemSVG />,
        }[toast.type];

        return (
            <section className="toast" key={toast.id}>
                <section className={`toast-badge toast-${toast.type}`}>{badge}</section>
                <section className="toast-text">{toast.text}</section>
                <button
                    className="toast-close"
                    onClick={() => removeToast(toast.id)}
                    aria-label="Close notification"
                >
                    ×
                </button>
            </section>
        );
    }, [removeToast]);

    return (
        <div className="toast-queue" onAnimationEnd={onAnimationEnd}>
            {toastQueue.map(ToastIter)}
        </div>
    );
};
