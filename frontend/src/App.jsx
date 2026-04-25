import { Moon, Sun } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import RegisterPage from "./pages/RegisterPage";
import DonorDashboard from "./pages/DonorDashboard";
import NgoDashboard from "./pages/NgoDashboard";
import VolunteerDashboard from "./pages/VolunteerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import { useAppStore } from "./store/useAppStore";
import { useNetworkStatus } from "./hooks/useNetworkStatus";
import AdminProtectedRoute from "./components/AdminProtectedRoute";
import { t } from "./i18n/translations";
import { socket } from "./services/socket";

const roleTitle = {
  donor: "donorTitle",
  ngo: "ngoTitle",
  volunteer: "volunteerTitle",
  admin: "adminTitle"
};

function AuthShell() {
  const user = useAppStore((s) => s.user);
  const setAuth = useAppStore((s) => s.setAuth);
  const clearAuth = useAppStore((s) => s.clearAuth);
  const isOnline = useNetworkStatus();
  const language = useAppStore((s) => s.language);
  const setLanguage = useAppStore((s) => s.setLanguage);
  const notifications = useAppStore((s) => s.notifications);
  const addNotification = useAppStore((s) => s.addNotification);
  const upsertDonation = useAppStore((s) => s.upsertDonation);
  const markAllNotificationsRead = useAppStore((s) => s.markAllNotificationsRead);
  const [showNotifications, setShowNotifications] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("annadaan_theme");
    if (saved) return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    const isDark = theme === "dark";
    document.documentElement.classList.toggle("dark", isDark);
    document.body.classList.toggle("dark", isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    localStorage.setItem("annadaan_theme", theme);
  }, [theme]);

  useEffect(() => {
    const formatDonationForUi = (donation) => {
      const pickupDate = donation?.pickupTime ? new Date(donation.pickupTime) : null;
      const isPickupValid = pickupDate && !Number.isNaN(pickupDate.getTime());
      return {
        ...donation,
        donorName: donation?.donorName || "Donor",
        pickupTimeLabel: isPickupValid ? pickupDate.toLocaleString() : donation?.pickupTime || "TBD",
        locationText: donation?.locationText || "Pickup point shared by donor"
      };
    };

    const handleNgoNewDonation = (payload) => {
      if (!user || user.role !== "ngo") return;
      if (!payload?.targetUserIds?.includes(user._id)) return;
      addNotification({ type: payload.type, message: payload.message });
    };
    const handleVolunteerAssigned = (payload) => {
      if (!user || user.role !== "volunteer") return;
      if (!payload?.targetUserIds?.includes(user._id)) return;
      addNotification({ type: payload.type, message: payload.message });
    };
    const handleNgoVolunteerAccepted = (payload) => {
      if (!user || user.role !== "ngo") return;
      if (!payload?.targetUserIds?.includes(user._id)) return;
      addNotification({ type: payload.type, message: payload.message });
    };
    const handleNgoNoVolunteer = (payload) => {
      if (!user || user.role !== "ngo") return;
      if (!payload?.targetUserIds?.includes(user._id)) return;
      addNotification({ type: payload.type, message: payload.message });
    };
    const handleDeliveryStatusNotification = (payload) => {
      if (!user) return;
      if (!payload?.targetUserIds?.includes(user._id)) return;
      addNotification({ type: payload.type, message: payload.message });
    };
    const handleDonationNew = (payload) => {
      if (!user) return;
      if (user.role === "donor" && payload?.donorId?.toString() !== user._id?.toString()) return;
      if (user.role === "ngo" || user.role === "volunteer") return;
      upsertDonation(formatDonationForUi(payload));
    };
    const handleDonationAccepted = (payload) => {
      if (!user) return;
      if (user.role === "donor" && payload?.donorId?.toString() !== user._id?.toString()) return;
      if (user.role === "ngo" && payload?.acceptedByNgoId?.toString() !== user._id?.toString()) return;
      upsertDonation(formatDonationForUi(payload));
    };
    const handleDonationStatus = (payload) => {
      if (!user) return;
      if (user.role === "donor" && payload?.donorId?.toString() !== user._id?.toString()) return;
      if (user.role === "ngo" && payload?.acceptedByNgoId?.toString() !== user._id?.toString()) return;
      upsertDonation(formatDonationForUi(payload));
    };
    socket.on("notification:ngo:new-donation", handleNgoNewDonation);
    socket.on("notification:volunteer:delivery-assigned", handleVolunteerAssigned);
    socket.on("notification:ngo:volunteer-accepted", handleNgoVolunteerAccepted);
    socket.on("notification:ngo:no-volunteer-nearby", handleNgoNoVolunteer);
    socket.on("notification:delivery:status", handleDeliveryStatusNotification);
    socket.on("donation:new", handleDonationNew);
    socket.on("donation:accepted", handleDonationAccepted);
    socket.on("donation:status", handleDonationStatus);
    return () => {
      socket.off("notification:ngo:new-donation", handleNgoNewDonation);
      socket.off("notification:volunteer:delivery-assigned", handleVolunteerAssigned);
      socket.off("notification:ngo:volunteer-accepted", handleNgoVolunteerAccepted);
      socket.off("notification:ngo:no-volunteer-nearby", handleNgoNoVolunteer);
      socket.off("notification:delivery:status", handleDeliveryStatusNotification);
      socket.off("donation:new", handleDonationNew);
      socket.off("donation:accepted", handleDonationAccepted);
      socket.off("donation:status", handleDonationStatus);
    };
  }, [addNotification, upsertDonation, user]);

  const handleAuthSuccess = (authData) => {
    setAuth({ user: authData.user, token: authData.token });
    if (authData.user.role === "admin") {
      navigate("/admin-dashboard", { replace: true });
    } else {
      navigate("/dashboard", { replace: true });
    }
  };

  const currentScreen = useMemo(() => {
    if (!user) return <RegisterPage onRegister={handleAuthSuccess} />;
    if (location.pathname === "/admin-dashboard" && user.role !== "admin") return <Navigate to="/dashboard" replace />;
    if (user.role === "donor") return <DonorDashboard />;
    if (user.role === "ngo") return <NgoDashboard />;
    if (user.role === "volunteer") return <VolunteerDashboard />;
    return <AdminDashboard />;
  }, [user, location.pathname]);

  if (!user && location.pathname !== "/") return <Navigate to="/" replace />;
  if (!user) return currentScreen;

  return (
    <div
      className={`${theme === "dark" ? "dark" : ""} min-h-screen px-4 py-4 transition-colors duration-300 lg:px-8 ${
        theme === "dark"
          ? "bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900"
          : "bg-gradient-to-br from-sky-100 via-indigo-50 to-amber-50"
      }`}
    >
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-7xl flex-col space-y-4">
        <header className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm dark:bg-slate-900/95">
          <div>
            <h1 className="font-bold text-slate-900 dark:text-slate-100">{t(language, "appName")}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t(language, roleTitle[user.role])} - {user?.name || "User"}
              {user?.phone ? ` (${user.phone})` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              aria-label="Language selector"
            >
              <option value="en">EN</option>
              <option value="hi">HI</option>
              <option value="mr">MR</option>
            </select>
            <button
              onClick={() => setTheme((prev) => (prev === "light" ? "dark" : "light"))}
              className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                theme === "light"
                  ? "border-slate-200 bg-white text-slate-700"
                  : "border-slate-700 bg-slate-800 text-slate-200"
              }`}
              aria-label="Toggle theme"
              title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            >
              {theme === "light" ? <Moon size={14} /> : <Sun size={14} />}
              <span>{theme === "light" ? "Light" : "Dark"}</span>
            </button>
            <button
              onClick={() => {
                setShowNotifications((prev) => !prev);
                markAllNotificationsRead();
              }}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:text-slate-200"
              title="Notifications"
            >
              Notifications ({notifications.filter((item) => !item.read).length})
            </button>
            <button
              onClick={() => {
                clearAuth();
                navigate("/", { replace: true });
              }}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:text-slate-200"
            >
              {t(language, "switchRole")}
            </button>
          </div>
        </header>
        {showNotifications ? (
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs dark:border-slate-700 dark:bg-slate-900">
            <p className="mb-2 font-semibold text-slate-800 dark:text-slate-100">Realtime Notifications</p>
            <div className="space-y-1">
              {notifications.length ? (
                notifications.slice(0, 8).map((item) => (
                  <p key={item.id} className="text-slate-600 dark:text-slate-300">
                    - {item.message}
                  </p>
                ))
              ) : (
                <p className="text-slate-500 dark:text-slate-400">No notifications yet.</p>
              )}
            </div>
          </div>
        ) : null}
        {!isOnline ? (
          <p className="rounded-xl bg-amber-100 px-3 py-2 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
            Offline mode: actions will sync when connectivity returns.
          </p>
        ) : null}
        <main
          className={`flex-1 rounded-2xl p-3 backdrop-blur-sm ${
            theme === "dark"
              ? "border border-slate-800 bg-slate-900/40 shadow-none"
              : "border border-indigo-100/70 bg-gradient-to-br from-white/80 via-indigo-50/60 to-sky-50/70 shadow-sm"
          }`}
        >
          {currentScreen}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AuthShell />} />
        <Route path="/dashboard" element={<AuthShell />} />
        <Route
          path="/admin-dashboard"
          element={
            <AdminProtectedRoute>
              <AuthShell />
            </AdminProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
