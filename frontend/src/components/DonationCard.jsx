import StatusBadge from "./StatusBadge";

const priorityStyles = {
  critical: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200",
  high: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200",
  normal: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200"
};

const getTimeLeftLabel = (expiryTime) => {
  if (!expiryTime) return "";
  const expiry = new Date(expiryTime).getTime();
  if (Number.isNaN(expiry)) return "";
  const deltaMins = Math.round((expiry - Date.now()) / 60000);
  if (deltaMins <= 0) return "Expired";
  const hours = Math.floor(deltaMins / 60);
  const mins = deltaMins % 60;
  if (!hours) return `${mins}m left`;
  return `${hours}h ${mins}m left`;
};

const formatTimelineTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
};

export default function DonationCard({ donation, onAccept, acceptLabel = "Accept Donation" }) {
  const timeLeft = getTimeLeftLabel(donation.expiryTime);
  const pickupAt = donation?.pickupTime ? new Date(donation.pickupTime).getTime() : NaN;
  const hasVolunteer = Boolean(donation?.assignedVolunteerId);
  const displayStatus =
    donation?.status === "accepted" && hasVolunteer
      ? Date.now() < pickupAt
        ? "pickup scheduled"
        : "volunteer assigned"
      : donation?.status;
  const timeline = [
    { key: "posted", label: "Posted", at: formatTimelineTime(donation?.createdAt) },
    { key: "ngoAccepted", label: "NGO Accepted", at: formatTimelineTime(donation?.acceptedAt) },
    { key: "volunteerAccepted", label: "Volunteer Accepted", at: formatTimelineTime(donation?.volunteerAcceptedAt) },
    { key: "volunteerRejected", label: "Volunteer Rejected", at: formatTimelineTime(donation?.volunteerRejectedAt) },
    { key: "picked", label: "Picked Up", at: formatTimelineTime(donation?.pickedAt) },
    {
      key: "delivered",
      label: "Delivered",
      at: formatTimelineTime(donation?.deliveredAt || donation?.deliveryProof?.confirmedAt)
    }
  ].filter((item) => item.at);
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{donation.donorName}</p>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">{donation.foodType}</h3>
        </div>
        <StatusBadge status={displayStatus} />
      </div>
      {donation.priority ? (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className={`rounded-full px-2 py-1 font-semibold capitalize ${priorityStyles[donation.priority] || priorityStyles.normal}`}>
            {donation.priority} priority
          </span>
          {typeof donation.matchScore === "number" ? (
            <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-200">
              Match Score: {donation.matchScore}
            </span>
          ) : null}
          {typeof donation.minutesToExpiry === "number" ? (
            <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-200">
              {donation.minutesToExpiry} mins left
            </span>
          ) : null}
        </div>
      ) : null}
      <div className="text-sm text-slate-600 dark:text-slate-300">
        <p>Meal Giver: {donation.donorName || "Donor"}</p>
        {donation?.volunteerName ? <p>Volunteer: {donation.volunteerName}</p> : null}
        {donation?.deliveryProof?.receiverName ? <p>Receiver: {donation.deliveryProof.receiverName}</p> : null}
        <p>Quantity: {donation.quantity}</p>
        <p>Pickup From: {donation.pickupTimeLabel || donation.pickupTime}</p>
        <p>Pickup Before: {donation.expiryTime ? new Date(donation.expiryTime).toLocaleString() : "Not set"}</p>
        {timeLeft ? <p>Time Left: {timeLeft}</p> : null}
        <p>Location: {donation.locationText}</p>
      </div>
      {donation?.imageUrl ? (
        <img
          src={donation.imageUrl}
          alt={`Meal shared by ${donation.donorName || "donor"}`}
          className="h-40 w-full rounded-lg object-cover"
        />
      ) : null}
      {donation?.ngoPickupImageUrl ? (
        <img
          src={donation.ngoPickupImageUrl}
          alt="NGO pickup proof"
          className="h-32 w-full rounded-lg object-cover"
        />
      ) : null}
      {donation?.deliveryProof?.proofImageUrl ? (
        <img
          src={donation.deliveryProof.proofImageUrl}
          alt="Volunteer delivery proof"
          className="h-32 w-full rounded-lg object-cover"
        />
      ) : null}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800/70">
        <p className="mb-2 font-semibold text-slate-700 dark:text-slate-200">Status Timeline</p>
        <div className="space-y-1">
          {timeline.length ? (
            timeline.map((item) => (
              <p key={item.key} className="text-slate-600 dark:text-slate-300">
                {item.label}: {item.at}
              </p>
            ))
          ) : (
            <p className="text-slate-500 dark:text-slate-400">No timeline updates yet.</p>
          )}
        </div>
      </div>
      {onAccept && donation.status === "pending" ? (
        <button
          onClick={() => onAccept(donation._id)}
          className="w-full rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.01]"
        >
          {acceptLabel}
        </button>
      ) : null}
    </div>
  );
}
