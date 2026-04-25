export default function LandingPage({ onSelectRole }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white px-4 py-8">
      <div className="mx-auto max-w-md space-y-6">
        <h1 className="text-3xl font-bold text-slate-900">AnnaDaan</h1>
        <p className="text-slate-600">
          Hyperlocal Food Surplus Network for India. Connect donors, NGOs, and volunteers to reduce food waste.
        </p>
        <div className="space-y-3">
          {["donor", "ngo", "volunteer", "admin"].map((role) => (
            <button
              key={role}
              onClick={() => onSelectRole(role)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left font-semibold capitalize text-slate-800 shadow-sm"
            >
              Continue as {role}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
