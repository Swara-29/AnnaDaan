import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { t } from "../i18n/translations";
import { acceptVolunteerTask, getDonations, rejectVolunteerTask, updateDeliveryStatus } from "../services/api/client";

export default function VolunteerDashboard() {
  const language = useAppStore((s) => s.language);
  const user = useAppStore((s) => s.user);
  const [tasks, setTasks] = useState([]);
  const [banner, setBanner] = useState("");
  const [proofByTask, setProofByTask] = useState({});

  const getTimeLeft = (expiryTime) => {
    if (!expiryTime) return "Unknown";
    const ms = new Date(expiryTime).getTime() - Date.now();
    if (Number.isNaN(ms)) return "Unknown";
    if (ms <= 0) return "Expired";
    const totalMinutes = Math.floor(ms / 60000);
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hrs}h ${mins}m`;
  };

  const completedCount = useMemo(
    () => tasks.filter((task) => task.status === "delivered").length,
    [tasks]
  );

  useEffect(() => {
    const loadTasks = async () => {
      if (!user?._id) return;
      try {
        const deliveryTasks = await getDonations({ volunteerId: user._id });
        setTasks(
          deliveryTasks.map((item, index) => ({
            id: item._id,
            donor: item.donorName || "Meal giver",
            meal: item.foodType,
            ngo: item.ngoName || "Assigned NGO",
            eta: `${18 + index * 7} mins`,
            status: item.status,
            distance: `${(1.8 + index * 0.9).toFixed(1)} km`,
            routeQuery: `Pickup and delivery for ${item.foodType}`,
            donationId: item._id,
            pickupAt: item.pickupTime ? new Date(item.pickupTime).toLocaleString() : "TBD",
            expiryAt: item.expiryTime ? new Date(item.expiryTime).toLocaleString() : "TBD",
            timeLeft: getTimeLeft(item.expiryTime),
            pickupTimeIso: item.pickupTime || null,
            locationText: item.locationText || "Pickup point shared by donor",
            imageUrl: item.imageUrl || "",
            donorPhone: item.donorPhone || "",
            volunteerName: item.volunteerName || "",
            assignedVolunteerId: item.assignedVolunteerId || null
          }))
        );
      } catch {}
    };
    loadTasks();
    const intervalId = window.setInterval(loadTasks, 30000);
    return () => window.clearInterval(intervalId);
  }, [user?._id]);

  const openRoute = (task) => {
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(task.routeQuery)}`;
    window.open(mapsUrl, "_blank", "noopener,noreferrer");
  };

  const markDelivered = async (taskId) => {
    const proof = proofByTask[taskId];
    if (!proof?.receiverName && !proof?.proofImageUrl) {
      setBanner("Add receiver name or proof image URL before delivery.");
      setTimeout(() => setBanner(""), 2200);
      return;
    }
    try {
      await updateDeliveryStatus({
        donationId: taskId,
        status: "delivered",
        receiverName: proof?.receiverName || "",
        proofImageUrl: proof?.proofImageUrl || ""
      });
    } catch {
      setBanner("Could not update delivery now. Please retry.");
      setTimeout(() => setBanner(""), 2200);
      return;
    }
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status: "delivered",
              eta: "Delivered just now"
            }
          : task
      )
    );
    setBanner("Delivery status updated successfully.");
    setTimeout(() => setBanner(""), 2200);
  };

  const acceptTask = async (taskId) => {
    try {
      await acceptVolunteerTask({
        donationId: taskId,
        volunteerId: user?._id
      });
      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId
            ? {
                ...task,
                status: "accepted",
                assignedVolunteerId: user?._id,
                volunteerName: user?.name || "You"
              }
            : task
        )
      );
      setBanner("Delivery accepted. NGO and donor are notified.");
    } catch (error) {
      setBanner(error?.response?.data?.message || "Unable to accept this delivery now.");
    }
    setTimeout(() => setBanner(""), 2200);
  };

  const rejectTask = async (task) => {
    try {
      await rejectVolunteerTask({
        donationId: task.id,
        volunteerId: user?._id
      });
      setTasks((prev) =>
        prev.map((item) =>
          item.id === task.id
            ? {
                ...item,
                assignedVolunteerId: null,
                volunteerName: "",
                status: "accepted"
              }
            : item
        )
      );
      setBanner("Delivery rejected. Donor, NGO and admin notified.");
    } catch (error) {
      setBanner(error?.response?.data?.message || "Unable to reject this task.");
    }
    setTimeout(() => setBanner(""), 2200);
  };

  const markPicked = async (task) => {
    try {
      await updateDeliveryStatus({
        donationId: task.id,
        status: "picked",
        volunteerId: user?._id
      });
      setTasks((prev) =>
        prev.map((item) =>
          item.id === task.id
            ? {
                ...item,
                status: "picked"
              }
            : item
        )
      );
      setBanner("Pickup updated. Donor, NGO and admin notified.");
    } catch (error) {
      setBanner(error?.response?.data?.message || "Unable to mark picked.");
    }
    setTimeout(() => setBanner(""), 2200);
  };

  const optimizeLocalRoute = () => {
    setTasks((prev) => [...prev].sort((a, b) => Number.parseFloat(a.distance) - Number.parseFloat(b.distance)));
    setBanner("Route optimized by nearest distance.");
    setTimeout(() => setBanner(""), 2200);
  };

  return (
    <div className="space-y-4">
      {banner ? (
        <p className="rounded-xl bg-emerald-100 px-3 py-2 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
          {banner}
        </p>
      ) : null}
      <div className="card bg-gradient-to-r from-emerald-600 to-green-500 p-5 text-white">
        <p className="text-sm text-emerald-100">Today</p>
        <h2 className="text-xl font-bold">
          {tasks.filter((task) => task.status !== "delivered").length} {t(language, "volunteerAssignments")}
        </h2>
        <p className="mt-1 text-sm text-emerald-100">Fastest route and urgency prioritized dispatching.</p>
      </div>
      <button
        onClick={optimizeLocalRoute}
        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        Optimize Route Sequence
      </button>

      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Completed</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{completedCount}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Avg. Delivery</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">27m</p>
        </div>
      </div>

      <div className="space-y-3">
        {tasks.map((task) => (
          <div key={task.id} className="card p-4">
            {(() => {
              const now = Date.now();
              const pickupTime = task.pickupTimeIso ? new Date(task.pickupTimeIso).getTime() : NaN;
              const pickupStarted = !Number.isNaN(pickupTime) && now >= pickupTime;
              const isMine = task.assignedVolunteerId && task.assignedVolunteerId === user?._id;
              const displayStatus =
                task.status === "accepted" && isMine
                  ? pickupStarted
                    ? "ready for pickup"
                    : "pickup scheduled"
                  : task.status;
              return (
                <>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">{task.donor}</h3>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  task.status === "delivered" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                }`}
              >
                {displayStatus}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Meal: {task.meal}</p>
            <p className="text-sm text-slate-600 dark:text-slate-300">Drop to NGO: {task.ngo}</p>
            {task.donorPhone ? <p className="text-xs text-slate-500 dark:text-slate-400">Giver Contact: {task.donorPhone}</p> : null}
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>ETA: {task.eta}</span>
              <span>{task.distance}</span>
            </div>
            <div className="mt-1 grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>Pickup from: {task.pickupAt}</span>
              <span>Takeaway by: {task.expiryAt}</span>
              <span>Time left: {task.timeLeft}</span>
              <span>Location: {task.locationText}</span>
            </div>
            {task.imageUrl ? <img src={task.imageUrl} alt={`Meal by ${task.donor}`} className="mt-2 h-36 w-full rounded-lg object-cover" /> : null}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input
                placeholder="Receiver Name"
                value={proofByTask[task.id]?.receiverName || ""}
                onChange={(e) =>
                  setProofByTask((prev) => ({
                    ...prev,
                    [task.id]: { ...prev[task.id], receiverName: e.target.value }
                  }))
                }
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
              />
              <input
                placeholder="Proof Image URL"
                value={proofByTask[task.id]?.proofImageUrl || ""}
                onChange={(e) =>
                  setProofByTask((prev) => ({
                    ...prev,
                    [task.id]: { ...prev[task.id], proofImageUrl: e.target.value }
                  }))
                }
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={() => acceptTask(task.id)}
                disabled={!!task.assignedVolunteerId}
                className="rounded-xl bg-blue-600 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {task.assignedVolunteerId ? (task.assignedVolunteerId === user?._id ? "Accepted by You" : "Taken") : "Accept Delivery"}
              </button>
              <button
                onClick={() => rejectTask(task)}
                disabled={task.assignedVolunteerId !== user?._id || task.status !== "accepted"}
                className="rounded-xl border border-rose-300 py-2 text-xs font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-700 dark:text-rose-300"
              >
                Reject Delivery
              </button>
              <button
                onClick={() => openRoute(task)}
                className="rounded-xl border border-slate-200 py-2 text-xs font-semibold transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                Open Route
              </button>
              <button
                onClick={() => markPicked(task)}
                disabled={task.assignedVolunteerId !== user?._id || task.status !== "accepted" || !pickupStarted}
                className="rounded-xl border border-indigo-300 py-2 text-xs font-semibold text-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-indigo-700 dark:text-indigo-300"
              >
                Mark Picked Up
              </button>
              <button
                onClick={() => markDelivered(task.id)}
                disabled={task.status !== "picked" || task.assignedVolunteerId !== user?._id}
                className="col-span-2 rounded-xl bg-brand-500 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {task.status === "delivered" ? "Delivered" : "Mark Delivered"}
              </button>
            </div>
                </>
              );
            })()}
          </div>
        ))}
      </div>
    </div>
  );
}
