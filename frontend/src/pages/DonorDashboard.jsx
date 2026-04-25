import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "../store/useAppStore";
import DonationCard from "../components/DonationCard";
import { createDonation, getDonations } from "../services/api/client";

const mapDonationForUi = (item, userName = "Donor", locationText = "My location") => ({
  ...item,
  donorName: userName,
  pickupTimeLabel: item.pickupTime ? new Date(item.pickupTime).toLocaleString() : "TBD",
  locationText: item.locationText || locationText || "Pickup point shared by donor"
});

export default function DonorDashboard() {
  const donations = useAppStore((s) => s.donations);
  const addDonation = useAppStore((s) => s.addDonation);
  const user = useAppStore((s) => s.user);
  const addNotification = useAppStore((s) => s.addNotification);
  const setDonations = useAppStore((s) => s.setDonations);
  const myDonations = useMemo(
    () => donations.filter((d) => d?.donorId?.toString?.() === user?._id?.toString?.()),
    [donations, user?._id]
  );
  const visibleDonations = useMemo(() => myDonations.filter((d) => d.status !== "expired"), [myDonations]);
  const pendingCount = visibleDonations.filter((d) => d.status === "pending").length;
  const acceptedCount = visibleDonations.filter((d) => d.status === "accepted").length;
  const deliveredCount = visibleDonations.filter((d) => d.status === "delivered").length;
  const [form, setForm] = useState({
    donorName: "Community Donor",
    foodType: "",
    quantity: "",
    pickupTime: "",
    expiryTime: "",
    locationText: "",
    imageUrl: ""
  });

  useEffect(() => {
    const loadMyDonations = async () => {
      if (!user?._id) return;
      try {
        const myDonations = await getDonations({ donorId: user._id });
        setDonations(myDonations.map((item) => mapDonationForUi(item, user?.name || "Donor", "My location")));
      } catch {}
    };
    loadMyDonations();
    const intervalId = window.setInterval(loadMyDonations, 30000);
    return () => window.clearInterval(intervalId);
  }, [setDonations, user?._id, user?.name]);

  const submitDonation = async (e) => {
    e.preventDefault();
    if (!form.foodType || !form.quantity || !form.pickupTime || !form.expiryTime || !form.locationText) return;
    try {
      const lat = user?.location?.coordinates?.[1];
      const lng = user?.location?.coordinates?.[0];
      if (lat === undefined || lng === undefined) {
        addNotification({ type: "error", message: "Location missing in profile. Re-register with location." });
        return;
      }
      const created = await createDonation({
        donorId: user._id,
        foodType: form.foodType,
        quantity: form.quantity,
        pickupTime: form.pickupTime,
        expiryTime: form.expiryTime,
        locationText: form.locationText,
        imageUrl: form.imageUrl || "",
        lat,
        lng
      });
      addDonation({
        ...mapDonationForUi(created, user?.name || form.donorName, form.locationText)
      });
      addNotification({ type: "success", message: "Donation posted. Nearby NGOs notified." });
      setForm({ ...form, foodType: "", quantity: "", pickupTime: "", expiryTime: "", locationText: "", imageUrl: "" });
    } catch {
      addNotification({ type: "error", message: "Failed to post donation." });
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-12 lg:gap-5">
      <section className="space-y-4 lg:col-span-8">
        <div className="relative overflow-hidden rounded-2xl border border-orange-200 bg-gradient-to-r from-orange-500 to-pink-500 p-5 text-white shadow-lg dark:border-orange-900/40">
          <div className="absolute -right-4 -top-6 text-6xl opacity-20">🍲</div>
          <p className="text-xs uppercase tracking-wider text-orange-100">Donor Impact</p>
          <h2 className="mt-1 text-xl font-bold lg:text-2xl">Turn Surplus into Smiles</h2>
          <p className="mt-1 text-sm text-orange-100">Post food quickly and track every donation lifecycle in one place.</p>
          <p className="mt-2 text-xs text-orange-100/95">
            Signed in as {user?.name || "Donor"}{user?.phone ? ` (${user.phone})` : ""}
          </p>
        </div>
        <div className="card p-4 lg:p-5">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Create Donation</h2>
          <form onSubmit={submitDonation} className="mt-3 grid gap-3 md:grid-cols-2">
            {[
              ["foodType", "Food Type"],
              ["quantity", "Quantity"],
              ["pickupTime", "Pickup From Time"],
              ["expiryTime", "Takeaway Before Time"],
              ["locationText", "Location"],
              ["imageUrl", "Meal Image URL"]
            ].map(([key, label]) => (
              <input
                key={key}
                type={key.includes("Time") ? "datetime-local" : "text"}
                value={form[key]}
                onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                placeholder={label}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            ))}
            <button className="w-full rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110 md:col-span-2">
              Post Donation
            </button>
          </form>
        </div>
        <div className="grid gap-3 xl:grid-cols-2">
          {visibleDonations.map((donation) => (
            <DonationCard key={donation._id} donation={donation} />
          ))}
        </div>
        {!visibleDonations.length ? (
          <div className="card p-4 text-sm text-slate-600 dark:text-slate-300">
            No active donations yet for your account. Create your first donation above.
          </div>
        ) : null}
      </section>

      <aside className="space-y-4 lg:col-span-4">
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Today at a glance</h3>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">Total</p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{visibleDonations.length}</p>
            </div>
            <div className="rounded-xl bg-amber-50 p-3 dark:bg-amber-900/20">
              <p className="text-xs text-amber-700 dark:text-amber-300">Pending</p>
              <p className="text-xl font-bold text-amber-700 dark:text-amber-200">{pendingCount}</p>
            </div>
            <div className="rounded-xl bg-blue-50 p-3 dark:bg-blue-900/20">
              <p className="text-xs text-blue-700 dark:text-blue-300">Accepted</p>
              <p className="text-xl font-bold text-blue-700 dark:text-blue-200">{acceptedCount}</p>
            </div>
            <div className="rounded-xl bg-green-50 p-3 dark:bg-green-900/20">
              <p className="text-xs text-green-700 dark:text-green-300">Meals Saved</p>
              <p className="text-xl font-bold text-green-700 dark:text-green-200">{deliveredCount * 12}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Tips for faster pickups</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <li>- Add exact landmark in location.</li>
            <li>- Mention meal packaging type.</li>
            <li>- Post at least 45 minutes before expiry.</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
