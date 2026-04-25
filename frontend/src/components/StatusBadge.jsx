const statusStyles = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
  accepted: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200",
  "pickup scheduled": "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-200",
  "volunteer assigned": "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200",
  "ready for pickup": "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-200",
  picked: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200",
  delivered: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200"
};

export default function StatusBadge({ status }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[status] || "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}>
      {status}
    </span>
  );
}
