import {Navigate, Outlet} from 'react-router-dom';

const ProtectedRoute = () => {
    const token: string | null = localStorage.getItem('token');

    if (!token) {
        return (
            <div className="fixed inset-0 bg-canvas z-9999 flex items-center justify-center">
                <Navigate to="/auth-required" replace/>
            </div>
        );
    }
    return <Outlet/>;
};

export default ProtectedRoute;
