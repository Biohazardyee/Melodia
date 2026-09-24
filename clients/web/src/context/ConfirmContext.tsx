import React, {createContext, useContext, useState, useCallback, useRef} from "react";
import {AlertTriangle} from "lucide-react";
import {useTranslation} from "react-i18next";

type ConfirmOptions = {
    title?: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    danger?: boolean;
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn>(async () => false);

export const ConfirmProvider = ({children}: { children: React.ReactNode }) => {
    const {t} = useTranslation();
    const [state, setState] = useState<{ open: boolean; options: ConfirmOptions }>({
        open: false,
        options: {},
    });
    const resolverRef = useRef<(v: boolean) => void>(() => {});

    const confirm: ConfirmFn = useCallback((options: ConfirmOptions): Promise<boolean> => {
        setState({open: true, options});
        return new Promise<boolean>((resolve) => {
            resolverRef.current = resolve;
        });
    }, []);

    const handleClose = (result: boolean): void => {
        setState((s) => ({...s, open: false}));
        resolverRef.current(result);
    };

    const {open, options} = state;

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}
            {open && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
                    onClick={() => handleClose(false)}
                >
                    <div
                        className="w-full max-w-sm bg-panel dark:bg-panel border border-line dark:border-line rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6">
                            <div className="flex items-start gap-4">
                                <div
                                    className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${
                                        options.danger
                                            ? "bg-red-500/15 text-red-500"
                                            : "bg-blue-500/15 text-blue-500"
                                    }`}
                                >
                                    <AlertTriangle size={22}/>
                                </div>
                                <div className="flex-1 pt-0.5">
                                    <h3 className="text-lg font-bold text-ink mb-1">
                                        {options.title || t("confirm_title", "Confirmation")}
                                    </h3>
                                    {options.message && (
                                        <p className="text-sm text-muted dark:text-muted leading-relaxed">
                                            {options.message}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => handleClose(false)}
                                    className="flex-1 py-2.5 rounded-xl font-semibold text-sm bg-raised dark:bg-raised text-slate-200 dark:text-gray-700 hover:bg-slate-700 dark:hover:bg-gray-200 transition-colors"
                                >
                                    {options.cancelText || t("cancel", "Annuler")}
                                </button>
                                <button
                                    onClick={() => handleClose(true)}
                                    className={`flex-1 py-2.5 rounded-xl font-semibold text-sm text-white transition-colors ${
                                        options.danger
                                            ? "bg-red-600 hover:bg-red-500"
                                            : "bg-blue-600 hover:bg-blue-500"
                                    }`}
                                >
                                    {options.confirmText || t("confirm_btn", "Confirmer")}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmContext.Provider>
    );
};

export const useConfirm = (): ConfirmFn => useContext(ConfirmContext);
