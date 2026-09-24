import React, {useEffect} from "react";
import {useNavigate, useSearchParams} from "react-router-dom";
import {jwtDecode} from "jwt-decode";

const AuthCallback: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    useEffect(() => {
        const token: string | null = searchParams.get("token");
        const error: string | null = searchParams.get("error");

        if (error) {
            console.error("Erreur OAuth:", error);
            navigate("/login", {
                state: {
                    error:
                        "La connexion via ce service a échoué ou le compte existe déjà.",
                },
            });
            return;
        }

        if (token) {
            try {
                localStorage.setItem("token", token);

                const decoded: any = jwtDecode(token);
                if (decoded.id) {
                    localStorage.setItem("userId", String(decoded.id));
                }

                window.dispatchEvent(new Event("auth-changed"));

                navigate("/home");
            } catch (err) {
                console.error("Erreur lors du décodage du token:", err);
                navigate("/login", {
                    state: {error: "Erreur de sécurité lors de la connexion."},
                });
            }
        } else {
            navigate("/login");
        }
    }, [navigate, searchParams]);

    return (
        <div className="min-h-screen bg-canvas flex items-center justify-center text-white">
            <div className="text-center">
                <div
                    className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-xl">Authentification en cours...</p>
            </div>
        </div>
    );
};

export default AuthCallback;
