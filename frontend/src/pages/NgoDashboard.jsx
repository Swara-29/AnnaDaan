import { useEffect, useMemo, useState } from "react";
import DonationCard from "../components/DonationCard";
import { useAppStore } from "../store/useAppStore";
import { t } from "../i18n/translations";
import { acceptDonation, getDonations, getNearbyDonations, getOptimizedRoute } from "../services/api/client";
import { socket } from "../services/socket";

const mapDonationForUi = (item) => {
  return {
    ...item,
    donorName: item.donorName || "Donor",
    pickupTimeLabel: item.pickupTime ? new Date(item.pickupTime).toLocaleString() : "TBD",
    locationText: item?.locationText || "Pickup point shared by donor"
  };
};

const parseMinutesToExpiry = (donation) => {
  const raw = donation.expiryTime || donation.pickupTime;
  if (!raw) return 240;
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return Math.max(0, Math.round((parsed.getTime() - Date.now()) / 60000));
  }
  if (typeof raw === "string" && raw.toLowerCase().includes("today")) return 180;
  return 240;
};

const getPriorityFromMinutes = (minutesToExpiry) => {
  if (minutesToExpiry <= 60) return "critical";
  if (minutesToExpiry <= 180) return "high";
  return "normal";
};

export default function NgoDashboard() {
  const donations = useAppStore((s) => s.donations);
  const setDonations = useAppStore((s) => s.setDonations);
  const updateDonationStatus = useAppStore((s) => s.updateDonationStatus);
  const user = useAppStore((s) => s.user);
  const addNotification = useAppStore((s) => s.addNotification);
  const language = useAppStore((s) => s.language);
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [routePlan, setRoutePlan] = useState([]);
  const [pickupImageByDonation, setPickupImageByDonation] = useState({});

  useEffect(() => {
    const loadNearby = async () => {
      try {
        const lat = user?.location?.coordinates?.[1];
        const lng = user?.location?.coordinates?.[0];
        if (lat === undefined || lng === undefined || !user?._id) return;
        const [nearby, myAccepted] = await Promise.all([
          getNearbyDonations(lat, lng, 8),
          getDonations({ ngoId: user._id })
        ]);
        const mergedById = new Map();
        [...nearby, ...myAccepted].forEach((item) => {
          if (!item?._id) return;
          mergedById.set(item._id.toString(), mapDonationForUi(item));
        });
        setDonations([...mergedById.values()]);
      } catch {}
    };
    loadNearby();
    const refreshOnTargetAlert = (payload) => {
      if (!user?._id) return;
      if (!payload?.targetUserIds?.includes(user._id)) return;
      loadNearby();
    };
    const onVolunteerAccepted = (payload) => {
      if (!user?._id) return;
      if (!payload?.targetUserIds?.includes(user._id)) return;
      addNotification({ type: payload.type, message: payload.message });
      loadNearby();
    };
    const onNoVolunteerNearby = (payload) => {
      if (!user?._id) return;
      if (!payload?.targetUserIds?.includes(user._id)) return;
      addNotification({ type: payload.type, message: payload.message });
    };
    socket.on("notification:ngo:new-donation", refreshOnTargetAlert);
    socket.on("notification:ngo:volunteer-accepted", onVolunteerAccepted);
    socket.on("notification:ngo:no-volunteer-nearby", onNoVolunteerNearby);
    const intervalId = window.setInterval(loadNearby, 30000);
    return () => {
      socket.off("notification:ngo:new-donation", refreshOnTargetAlert);
      socket.off("notification:ngo:volunteer-accepted", onVolunteerAccepted);
      socket.off("notification:ngo:no-volunteer-nearby", onNoVolunteerNearby);
      window.clearInterval(intervalId);
    };
  }, [addNotification, setDonations, user]);

  useEffect(() => {
    const loadRoute = async () => {
      try {
        const data = await getOptimizedRoute(user?._id || "");
        setRoutePlan(data.route || []);
      } catch {
        setRoutePlan([]);
      }
    };
    loadRoute();
  }, [user?._id]);

  const rankedDonations = useMemo(() => {
    return donations
      .map((donation) => {
        const minutesToExpiry = parseMinutesToExpiry(donation);
        const priority = getPriorityFromMinutes(minutesToExpiry);
        const urgencyScore = Math.max(0, 100 - Math.floor(minutesToExpiry / 3));
        const statusScore = donation.status === "pending" ? 30 : 0;
        return {
          ...donation,
          minutesToExpiry,
          priority,
          matchScore: Math.min(100, urgencyScore + statusScore)
        };
      })
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === "pending" ? -1 : 1;
        return b.matchScore - a.matchScore;
      });
  }, [donations]);

  const visibleDonations = useMemo(() => {
    if (priorityFilter === "all") return rankedDonations;
    return rankedDonations.filter((d) => d.priority === priorityFilter);
  }, [priorityFilter, rankedDonations]);

  const priorityStats = useMemo(
    () => ({
      critical: rankedDonations.filter((d) => d.priority === "critical" && d.status === "pending").length,
      high: rankedDonations.filter((d) => d.priority === "high" && d.status === "pending").length,
      normal: rankedDonations.filter((d) => d.priority === "normal" && d.status === "pending").length
    }),
    [rankedDonations]
  );

  return (
    <div className="space-y-4">
      <div className="card bg-gradient-to-r from-blue-600 to-cyan-500 p-5 text-white">
        <p className="text-xs uppercase tracking-wider text-blue-100">{t(language, "ngoDispatch")}</p>
        <h2 className="mt-1 text-xl font-bold">Nearby Donations</h2>
        <p className="text-sm text-blue-100">{t(language, "smartQueue")}</p>
        <p className="mt-2 text-xs text-blue-100/95">
          Signed in as {user?.name || "NGO"}{user?.phone ? ` (${user.phone})` : ""}
        </p>
      </div>
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Optimized Pickup Route</h3>
        <div className="mt-2 space-y-2">
          {routePlan.length ? (
            routePlan.map((stop) => (
              <div key={stop.donationId} className="rounded-lg bg-slate-50 px-3 py-2 text-xs dark:bg-slate-800">
                Stop {stop.stop}: {stop.foodType} ({stop.quantity}) - ETA {stop.etaMinutes} mins
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">No active optimized route yet.</p>
          )}
        </div>
      </div>
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: "all", label: "All" },
            { id: "critical", label: `Critical (${priorityStats.critical})` },
            { id: "high", label: `High (${priorityStats.high})` },
            { id: "normal", label: `Normal (${priorityStats.normal})` }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setPriorityFilter(item.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                priorityFilter === item.id
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        {visibleDonations.map((donation) => (
          <div key={donation._id} className="space-y-2">
            <DonationCard
              donation={donation}
              acceptLabel="Accept Pickup"
              onAccept={async (id) => {
                try {
                  await acceptDonation({
                    donationId: id,
                    ngoId: user?._id,
                    ngoPickupImageUrl: pickupImageByDonation[id] || ""
                  });
                  updateDonationStatus(id, "accepted");
                  addNotification({ type: "success", message: "Accepted. Nearby volunteers notified for delivery." });
                } catch {
                  addNotification({ type: "error", message: "Unable to accept donation." });
                }
              }}
            />
            {donation.status === "pending" ? (
              <input
                type="text"
                value={pickupImageByDonation[donation._id] || ""}
                onChange={(e) => setPickupImageByDonation((prev) => ({ ...prev, [donation._id]: e.target.value }))}
                placeholder="NGO pickup image URL (optional)"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            ) : null}
          </div>
        ))}
      </div>
      {!visibleDonations.length ? (
        <div className="card p-4 text-sm text-slate-600 dark:text-slate-300">
          No nearby or accepted donations yet. New nearby posts will appear here automatically.
        </div>
      ) : null}
    </div>
  );
}
