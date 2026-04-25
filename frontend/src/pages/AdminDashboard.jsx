import { useEffect, useMemo, useState } from "react";
import { deleteAdminUser, getAdminActivity, getAdminDonations, getAdminStats, getAdminUsers } from "../services/api/client";

const fallbackUsers = [
  { _id: "u1", name: "Riya Foods", phone: "9999990001", role: "donor", onboardingStatus: "pending", isActive: true, reliabilityScore: 86 },
  { _id: "u2", name: "Udaan Shelter", phone: "9999990002", role: "ngo", onboardingStatus: "pending", isActive: true, reliabilityScore: 78 },
  { _id: "u3", name: "Aman Patil", phone: "9999990003", role: "volunteer", onboardingStatus: "approved", isActive: true, reliabilityScore: 90 }
];

const fallbackStats = { users: 124, donors: 52, ngos: 23, volunteers: 41, donations: 328, expired: 14, escalated: 6 };

export default function AdminDashboard() {
  const [stats, setStats] = useState(fallbackStats);
  const [users, setUsers] = useState(fallbackUsers);
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentDonations, setRecentDonations] = useState([]);
  const [donations, setDonations] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [dashboardData, userData, activityData, donationData] = await Promise.all([
          getAdminStats(),
          getAdminUsers(),
          getAdminActivity(),
          getAdminDonations()
        ]);
        setStats(dashboardData);
        setUsers(userData);
        setRecentUsers(activityData.recentUsers || []);
        setRecentDonations(activityData.recentDonations || []);
        setDonations(donationData || []);
      } catch {
        // Keep robust UX with fallback data when API is unavailable.
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const visibleUsers = useMemo(() => {
    if (filter === "all") return users;
    return users.filter((u) => u.onboardingStatus === filter);
  }, [users, filter]);

  const roleStats = useMemo(() => {
    const donors = stats.donors || users.filter((u) => u.role === "donor").length;
    const ngos = stats.ngos || users.filter((u) => u.role === "ngo").length;
    const volunteers = stats.volunteers || users.filter((u) => u.role === "volunteer").length;
    const admins = users.filter((u) => u.role === "admin").length;
    const total = Math.max(1, donors + ngos + volunteers + admins);
    return { donors, ngos, volunteers, admins, total };
  }, [stats, users]);

  const donutGradient = `conic-gradient(#f59e0b 0% ${(roleStats.donors / roleStats.total) * 100}%,
    #ec4899 ${(roleStats.donors / roleStats.total) * 100}% ${((roleStats.donors + roleStats.ngos) / roleStats.total) * 100}%,
    #22c55e ${((roleStats.donors + roleStats.ngos) / roleStats.total) * 100}% ${((roleStats.donors + roleStats.ngos + roleStats.volunteers) / roleStats.total) * 100}%,
    #6366f1 ${((roleStats.donors + roleStats.ngos + roleStats.volunteers) / roleStats.total) * 100}% 100%)`;

  const weeklyActivity = [
    { day: "Mon", users: 8, donations: 12 },
    { day: "Tue", users: 11, donations: 15 },
    { day: "Wed", users: 7, donations: 10 },
    { day: "Thu", users: 14, donations: 18 },
    { day: "Fri", users: 10, donations: 16 },
    { day: "Sat", users: 16, donations: 22 },
    { day: "Sun", users: 12, donations: 14 }
  ];
  const maxActivity = Math.max(...weeklyActivity.map((d) => Math.max(d.users, d.donations)));

  const handleDeleteUser = async (user) => {
    if (!user?._id || user.role === "admin") return;
    const isConfirmed = window.confirm(
      `Delete ${user.name} (${user.role})?\n\nThis will remove the user account and may reset/delete related donation records.`
    );
    if (!isConfirmed) return;
    setActionMessage("");
    setDeletingUserId(user._id);
    try {
      const result = await deleteAdminUser(user._id);
      setUsers((prev) => prev.filter((item) => item._id !== user._id));
      setRecentUsers((prev) => prev.filter((item) => item._id !== user._id));
      setStats((prev) => ({
        ...prev,
        users: Math.max(0, (prev.users || 0) - 1),
        donors: user.role === "donor" ? Math.max(0, (prev.donors || 0) - 1) : prev.donors,
        ngos: user.role === "ngo" ? Math.max(0, (prev.ngos || 0) - 1) : prev.ngos,
        volunteers: user.role === "volunteer" ? Math.max(0, (prev.volunteers || 0) - 1) : prev.volunteers
      }));
      setActionMessage(
        `Deleted ${user.role} "${user.name}". Impacted donations: ${result?.impactedDonations ?? 0}.`
      );
    } catch (error) {
      setActionMessage(error?.response?.data?.message || "Unable to delete user right now.");
    } finally {
      setDeletingUserId("");
    }
  };

  return (
    <div className="space-y-4">
      <div className="card bg-gradient-to-r from-slate-900 to-slate-700 p-5 text-white">
        <p className="text-xs uppercase tracking-wider text-slate-300">Control Center</p>
        <h2 className="mt-1 text-xl font-bold">Admin Operations Dashboard</h2>
        <p className="mt-1 text-sm text-slate-300">Approve registrations, manage roles, and monitor delivery impact.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="card p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Users</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.users}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Total Donations</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.donations}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Donors</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.donors}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">NGOs / Volunteers</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {stats.ngos} / {stats.volunteers}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Expired / Escalated</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {stats.expired || 0} / {stats.escalated || 0}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-4">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">Donation Funnel</h3>
          <div className="mt-4 space-y-3">
            {[
              { label: "Total", value: stats.donations || 1, color: "bg-slate-500" },
              { label: "Donors", value: stats.donors || 0, color: "bg-amber-500" },
              { label: "Volunteers", value: stats.volunteers || 0, color: "bg-green-500" }
            ].map((item) => (
              <div key={item.label}>
                <div className="mb-1 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                  <span>{item.label}</span>
                  <span>{item.value}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={`h-2 rounded-full ${item.color} transition-all duration-500`}
                    style={{ width: `${Math.min(100, (item.value / (stats.donations || 1)) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-4">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">Role Distribution</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-center">
              <div className="relative h-36 w-36">
                <div className="h-36 w-36 rounded-full shadow-inner" style={{ background: donutGradient }} />
                <div className="absolute inset-4 flex flex-col items-center justify-center rounded-full bg-white text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  <span className="text-xs">Total</span>
                  <span className="text-lg font-bold">{roleStats.total}</span>
                </div>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              {[
                { label: "Donors", value: roleStats.donors, color: "bg-amber-500" },
                { label: "NGOs", value: roleStats.ngos, color: "bg-pink-500" },
                { label: "Volunteers", value: roleStats.volunteers, color: "bg-green-500" },
                { label: "Admins", value: roleStats.admins, color: "bg-indigo-500" }
              ].map((item) => (
                <div key={item.label} className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800">
                  <div className="mb-1 flex items-center justify-between text-slate-600 dark:text-slate-200">
                    <span>{item.label}</span>
                    <span className="font-semibold">{item.value}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700">
                    <div className={`h-1.5 rounded-full ${item.color}`} style={{ width: `${(item.value / roleStats.total) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card p-4">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">Weekly Activity Insights</h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">New users vs donation requests trend</p>
        <div className="mt-4 grid grid-cols-7 gap-2">
          {weeklyActivity.map((entry) => (
            <div key={entry.day} className="rounded-xl bg-slate-50 p-2 text-center dark:bg-slate-800">
              <div className="mb-2 flex h-24 items-end justify-center gap-1">
                <div
                  className="w-2 rounded-t bg-indigo-500"
                  style={{ height: `${Math.max(8, (entry.users / maxActivity) * 96)}px` }}
                  title={`Users: ${entry.users}`}
                />
                <div
                  className="w-2 rounded-t bg-orange-500"
                  style={{ height: `${Math.max(8, (entry.donations / maxActivity) * 96)}px` }}
                  title={`Donations: ${entry.donations}`}
                />
              </div>
              <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">{entry.day}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-indigo-500" /> Users</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-500" /> Donations</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-4">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">Recent Registrations</h3>
          <div className="mt-3 space-y-2">
            {(recentUsers.length ? recentUsers : users.slice(0, 5)).map((u) => (
              <div key={u._id || u.name} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800">
                <span className="text-sm text-slate-700 dark:text-slate-200">{u.name}</span>
                <span className="text-xs capitalize text-slate-500 dark:text-slate-400">{u.role}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-4">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">Recent Donation Activity</h3>
          <div className="mt-3 space-y-2">
            {(recentDonations.length ? recentDonations : donations.slice(0, 5)).map((d) => (
              <div key={d._id || `${d.foodType}-${d.createdAt}`} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800">
                <span className="text-sm text-slate-700 dark:text-slate-200">{d.foodType}</span>
                <span className="text-xs capitalize text-slate-500 dark:text-slate-400">{d.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">Registration Details</h3>
          {loading ? <span className="text-xs text-slate-500 dark:text-slate-400">Syncing...</span> : null}
        </div>
        {actionMessage ? (
          <p className="mb-3 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {actionMessage}
          </p>
        ) : null}
        <div className="mb-3 flex gap-2 text-xs">
          {["all", "approved", "rejected"].map((key) => (
            <button
              key={key}
              className={`rounded-full px-3 py-1.5 ${filter === key ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}
              onClick={() => setFilter(key)}
            >
              {key}
            </button>
          ))}
        </div>
        <div className="space-y-3">
          {visibleUsers.map((user) => (
            <div key={user._id} className="rounded-xl border border-slate-100 p-3 dark:border-slate-800">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{user.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{user.phone}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs capitalize dark:bg-slate-800 dark:text-slate-200">{user.role}</span>
              </div>
              <p className="mt-2 text-xs capitalize text-slate-500 dark:text-slate-400">Status: {user.onboardingStatus}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Reliability Score: {user.reliabilityScore ?? 80}</p>
              <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                Operational approvals and delivery actions are handled in NGO/Volunteer workflows.
              </p>
              {user.role !== "admin" ? (
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleDeleteUser(user)}
                    disabled={deletingUserId === user._id}
                    className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-200 dark:hover:bg-rose-900/40"
                  >
                    {deletingUserId === user._id ? "Deleting..." : "Delete User"}
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
