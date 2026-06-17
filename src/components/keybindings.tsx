import { useCallback, useEffect, useState } from "react";
import { useContext } from "react";
import { defaultKeyBindings } from "../utils/default-keybindings.js";
import { InputAction } from "../utils/input-action.js";
import type { KeyBinding } from "../utils/keybindings.js";
import { appContext } from "./app.context.js";
import { toastPubSub } from "./toast.js";
import "./keybindings.css";

interface IKeyBindingRow {
    action: InputAction;
    description: string;
    currentBinding: KeyBinding[];
    isRecording: boolean;
    showActionName: boolean;
}

// Mapping from InputAction to language key
const actionDescriptionKeys: Record<InputAction, string> = {
    // Synchronizer actions
    [InputAction.Sync]: "sync",
    [InputAction.DeleteTime]: "deleteTime",
    [InputAction.ResetOffset]: "resetOffset",
    [InputAction.DecreaseOffset]: "decreaseOffset",
    [InputAction.IncreaseOffset]: "increaseOffset",
    [InputAction.PrevLine]: "prevLine",
    [InputAction.NextLine]: "nextLine",
    [InputAction.FirstLine]: "firstLine",
    [InputAction.LastLine]: "lastLine",
    [InputAction.PageUp]: "pageUp",
    [InputAction.PageDown]: "pageDown",

    // Audio control actions
    [InputAction.SeekBackward]: "seekBackward",
    [InputAction.SeekForward]: "seekForward",
    [InputAction.ResetRate]: "resetRate",
    [InputAction.IncreaseRate]: "increaseRate",
    [InputAction.DecreaseRate]: "decreaseRate",
    [InputAction.TogglePlay]: "togglePlay",

    // Global actions
    [InputAction.ShowHelp]: "showHelp",
};

// Generate a human-readable string from a KeyBinding
const bindingToString = (binding: KeyBinding): string => {
    const parts: string[] = [];
    if (binding.ctrlKey) parts.push("Ctrl");
    if (binding.altKey) parts.push("Alt");
    if (binding.shiftKey) parts.push("Shift");

    // Convert code to human-readable key
    const keyMap: Record<string, string> = {
        "Space": "Space",
        "Enter": "Enter",
        "ArrowUp": "↑",
        "ArrowDown": "↓",
        "ArrowLeft": "←",
        "ArrowRight": "→",
        "Home": "Home",
        "End": "End",
        "PageUp": "PageUp",
        "PageDown": "PageDown",
        "Backspace": "Backspace",
        "Delete": "Delete",
    };

    const key = binding.code
        ? (keyMap[binding.code] || binding.code.replace("Key", "").replace("Digit", ""))
        : "Unknown";
    parts.push(key);

    return parts.join("+");
};

export const KeyBindingsPage: React.FC = () => {
    const { prefState, prefDispatch, lang } = useContext(appContext);

    // Array of all InputAction values since we can't use Object.values() on const enum
    const allActions: InputAction[] = [
        InputAction.Sync,
        InputAction.DeleteTime,
        InputAction.ResetOffset,
        InputAction.DecreaseOffset,
        InputAction.IncreaseOffset,
        InputAction.PrevLine,
        InputAction.NextLine,
        InputAction.FirstLine,
        InputAction.LastLine,
        InputAction.PageUp,
        InputAction.PageDown,
        InputAction.SeekBackward,
        InputAction.SeekForward,
        InputAction.ResetRate,
        InputAction.IncreaseRate,
        InputAction.DecreaseRate,
        InputAction.TogglePlay,
        InputAction.ShowHelp,
    ];

    const [rows, setRows] = useState<IKeyBindingRow[]>(() => {
        return allActions.map(action => ({
            action,
            description: (lang.keybindings.actions as Record<string, string>)[actionDescriptionKeys[action]],
            currentBinding: prefState.keyBindings[action] || defaultKeyBindings[action],
            isRecording: false,
            showActionName: false,
        }));
    });

    const [tempKeyBindings, setTempKeyBindings] = useState(prefState.keyBindings);

    // Update tempKeyBindings when prefState.keyBindings changes
    useEffect(() => {
        setTempKeyBindings(prefState.keyBindings);
    }, [prefState.keyBindings]);

    // Update rows when tempKeyBindings changes
    useEffect(() => {
        setRows(prevRows => {
            return prevRows.map(row => ({
                ...row,
                currentBinding: tempKeyBindings[row.action] || defaultKeyBindings[row.action],
                description: (lang.keybindings.actions as Record<string, string>)[actionDescriptionKeys[row.action]],
            }));
        });
    }, [tempKeyBindings, lang]);

    // Toggle action name visibility for 2 seconds
    const toggleActionName = useCallback((action: InputAction) => {
        setRows(prevRows => {
            return prevRows.map(row => {
                if (row.action === action) {
                    return {
                        ...row,
                        showActionName: true,
                    };
                }
                return row;
            });
        });

        // Reset after 2 seconds
        setTimeout(() => {
            setRows(prevRows => {
                return prevRows.map(row => {
                    if (row.action === action) {
                        return {
                            ...row,
                            showActionName: false,
                        };
                    }
                    return row;
                });
            });
        }, 2000);
    }, []);

    const startRecording = useCallback((action: InputAction) => {
        setRows(prevRows => {
            return prevRows.map(row => ({
                ...row,
                isRecording: row.action === action,
            }));
        });
    }, []);

    const stopRecording = useCallback(() => {
        setRows(prevRows => {
            return prevRows.map(row => ({
                ...row,
                isRecording: false,
            }));
        });
    }, []);

    const handleKeyUp = useCallback((ev: KeyboardEvent) => {
        // Find the row that is currently recording
        const recordingRow = rows.find(row => row.isRecording);
        if (!recordingRow) return;

        ev.preventDefault();
        ev.stopPropagation();

        // Create a new key binding from the event
        const newBinding: KeyBinding = {
            code: ev.code,
            ctrlKey: ev.ctrlKey || ev.metaKey, // Handle both Ctrl and Meta keys
            altKey: ev.altKey,
            shiftKey: ev.shiftKey,
        };

        // Only record if a non-modifier key is pressed
        const isModifierKey = [
            "ControlLeft",
            "ControlRight",
            "MetaLeft",
            "MetaRight",
            "AltLeft",
            "AltRight",
            "ShiftLeft",
            "ShiftRight",
        ].includes(ev.code);
        if (!isModifierKey) {
            // Update the tempKeyBindings
            setTempKeyBindings(prev => {
                const newBindings = { ...prev };
                newBindings[recordingRow.action] = [...newBindings[recordingRow.action] || [], newBinding];
                return newBindings;
            });

            // Stop recording
            stopRecording();
        }
    }, [rows, stopRecording]);

    const handleKeyDown = useCallback((ev: KeyboardEvent) => {
        // Find the row that is currently recording
        const recordingRow = rows.find(row => row.isRecording);
        if (!recordingRow) return;

        ev.preventDefault();
        ev.stopPropagation();

        // Don't do anything on keydown, wait for keyup to get the complete combination
    }, [rows]);

    // Add global keyboard listeners when recording
    useEffect(() => {
        if (rows.some(row => row.isRecording)) {
            window.addEventListener("keydown", handleKeyDown);
            window.addEventListener("keyup", handleKeyUp);
        }
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
        };
    }, [rows, handleKeyDown, handleKeyUp]);

    const removeBinding = useCallback((action: InputAction, index: number) => {
        setTempKeyBindings(prev => {
            const newBindings = { ...prev };
            const bindings = [...newBindings[action] || []];
            bindings.splice(index, 1);
            newBindings[action] = bindings;
            return newBindings;
        });
    }, []);

    const resetToDefaults = useCallback(() => {
        setTempKeyBindings(defaultKeyBindings);

        // Show notification
        toastPubSub.pub({
            type: "info",
            text: lang.keybindings.resetSuccess,
        });
    }, [lang]);

    // Check for key binding conflicts
    const checkConflicts = useCallback(() => {
        const bindingMap = new Map<string, InputAction>();
        let conflicts: { action1: InputAction; action2: InputAction; binding: string }[] = [];

        // Helper function to create a unique key for a binding
        const getBindingKey = (binding: KeyBinding) => {
            const parts: string[] = [];
            if (binding.ctrlKey) parts.push("Ctrl");
            if (binding.altKey) parts.push("Alt");
            if (binding.shiftKey) parts.push("Shift");
            const key = binding.code ? binding.code : "Unknown";
            parts.push(key);
            return parts.join("+");
        };

        // Check all bindings
        for (const [action, bindings] of Object.entries(tempKeyBindings)) {
            for (const binding of bindings as KeyBinding[]) {
                const bindingKey = getBindingKey(binding);
                if (bindingMap.has(bindingKey)) {
                    // Conflict found
                    conflicts.push({
                        action1: bindingMap.get(bindingKey) as InputAction,
                        action2: action as InputAction,
                        binding: bindingKey,
                    });
                } else {
                    bindingMap.set(bindingKey, action as InputAction);
                }
            }
        }

        return conflicts;
    }, [tempKeyBindings]);

    const saveBindings = useCallback(() => {
        const conflicts = checkConflicts();
        if (conflicts.length > 0) {
            // Show conflict error
            toastPubSub.pub({
                type: "warning",
                text: lang.keybindings.conflictError.replace("%d", conflicts.length.toString()),
            });
            return;
        }

        // Save bindings
        prefDispatch({ type: "keyBindings", payload: tempKeyBindings });

        // Show success notification
        toastPubSub.pub({
            type: "success",
            text: lang.keybindings.saveSuccess,
        });
    }, [prefDispatch, tempKeyBindings, checkConflicts, lang]);

    return (
        <div className="preferences">
            <h2 style={{ textAlign: "center", margin: "1rem 0" }}>{lang.keybindings.title}</h2>

            <div
                className="keybindings-controls"
                style={{ display: "flex", justifyContent: "center", gap: "1rem", margin: "1rem 0" }}
            >
                <button className="record-button" onClick={resetToDefaults}>{lang.keybindings.resetToDefaults}</button>
                <button className="record-button" onClick={saveBindings}>{lang.keybindings.save}</button>
            </div>

            <ul>
                {rows.map(row => (
                    <li key={row.action}>
                        <section className="list-item">
                            <div
                                className="action-description"
                                style={{ cursor: "pointer", padding: "0.5rem" }}
                                onClick={() => toggleActionName(row.action)}
                            >
                                {row.showActionName
                                    ? <div style={{ fontWeight: "bold" }}>{row.action}</div>
                                    : <div>{row.description}</div>}
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                                <div className="binding-container">
                                    {row.currentBinding.map((binding, index) => (
                                        <div key={index} className="binding-item">
                                            <span>{bindingToString(binding)}</span>
                                            <button
                                                className="remove-binding"
                                                onClick={() =>
                                                    removeBinding(row.action, index)}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                    {row.currentBinding.length === 0 && (
                                        <span className="no-binding">{lang.keybindings.noBinding}</span>
                                    )}
                                </div>

                                <button
                                    className={`record-button ${row.isRecording ? "recording" : ""}`}
                                    onClick={row.isRecording ? undefined : () => startRecording(row.action)}
                                    disabled={row.isRecording}
                                >
                                    {row.isRecording ? lang.keybindings.recording : lang.keybindings.record}
                                </button>
                            </div>
                        </section>
                    </li>
                ))}
            </ul>
        </div>
    );
};
