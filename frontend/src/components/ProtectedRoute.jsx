import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";

export default function ProtectedRoute({ children }) {
	const { user } = useAuth();
	return user ? children : <Navigate to="/login" />;
}
