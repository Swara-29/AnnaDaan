import { Navigate } from "react-router-dom";
import { useAppStore } from "../store/useAppStore";

export default function AdminProtectedRoute({ children }) {
  const user = useAppStore((s) => s.user);
  if (!user) return <Navigate to="/" replace />;
  if (user.role !== "admin") return <Navigate to="/" replace />;
  return children;
}
