import {useNavigate, NavigateFunction} from "react-router-dom";
import {backDestination} from "../utils/navigation";

/**
 * Retourne une fonction "retour" fiable.
 *
 * `navigate(-1)` ne fait rien lorsque la page courante est la première entrée
 * de l'historique de session (ouverture directe, redirection après login en
 * `replace`, etc.) — d'où l'impression qu'il faut cliquer deux fois.
 * Ici on détecte ce cas via `window.history.state.idx` (posé par React Router)
 * et on bascule sur une route de repli.
 */
export function useGoBack(fallback: string = "/home"): () => void {
    const navigate: NavigateFunction = useNavigate();

    return (): void => {
        const destination = backDestination(window.history.state?.idx, fallback);
        if (destination === -1) {
            navigate(-1);
        } else {
            navigate(destination);
        }
    };
}
