import { useEffect, useState } from "react";
import { Eye, EyeOff, Moon, Sun } from "lucide-react";
import { loginWithPhonePassword, registerUser } from "../services/api/client";

const roles = [
  {
    id: "donor",
    label: "Donor",
    icon: "🍱",
    active: "from-orange-500 to-amber-500",
    ring: "ring-orange-300/60",
    accent: "text-orange-600 dark:text-orange-300",
    panel: "from-orange-500/20 to-amber-500/20",
    blurb: "Share extra meals from home, events, and restaurants."
  },
  {
    id: "ngo",
    label: "NGO",
    icon: "🏢",
    active: "from-pink-500 to-rose-500",
    ring: "ring-pink-300/60",
    accent: "text-pink-600 dark:text-pink-300",
    panel: "from-pink-500/20 to-rose-500/20",
    blurb: "Discover nearby food and route it to those in need."
  },
  {
    id: "volunteer",
    label: "Volunteer",
    icon: "🚴",
    active: "from-yellow-500 to-orange-500",
    ring: "ring-yellow-300/60",
    accent: "text-yellow-700 dark:text-yellow-300",
    panel: "from-yellow-500/20 to-orange-500/20",
    blurb: "Deliver food quickly with route-first assignments."
  }
];

export default function RegisterPage({ onRegister }) {
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    password: "",
    confirmPassword: "",
    lat: "",
    lng: "",
    location: ""
  });
  const [selectedRole, setSelectedRole] = useState("");
  const [mode, setMode] = useState("register");
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

  const onChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };
  const resolveLocationLabel = async (latitude, longitude) => {
    const endpoint = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`;
    const response = await fetch(endpoint, {
      headers: {
        Accept: "application/json"
      }
    });
    if (!response.ok) {
      throw new Error("Reverse geocode failed");
    }
    const payload = await response.json();
    const address = payload?.address || {};
    const preferredLabel =
      address.suburb ||
      address.neighbourhood ||
      address.village ||
      address.town ||
      address.city ||
      address.state_district ||
      address.state;
    if (preferredLabel) return preferredLabel;
    return payload?.display_name || `${latitude}, ${longitude}`;
  };
  const fillCurrentLocation = () => {
    if (!("geolocation" in navigator)) {
      setError("Geolocation is not supported in this browser. Enter location manually.");
      return;
    }
    if (!window.isSecureContext && window.location.hostname !== "localhost") {
      setError("Current location needs HTTPS (or localhost). Enter location manually.");
      return;
    }
    setError("");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude.toFixed(6);
        const longitude = position.coords.longitude.toFixed(6);
        onChange("lat", latitude);
        onChange("lng", longitude);
        try {
          const placeLabel = await resolveLocationLabel(latitude, longitude);
          onChange("location", placeLabel);
        } catch {
          onChange("location", `Near ${latitude}, ${longitude}`);
        }
      },
      (geoError) => {
        if (geoError.code === 1) {
          setError("Location permission denied. Allow location access and try again.");
          return;
        }
        if (geoError.code === 2) {
          setError("Location unavailable right now. Please try again.");
          return;
        }
        if (geoError.code === 3) {
          setError("Location request timed out. Please try again.");
          return;
        }
        setError("Unable to fetch current location. Enter location manually.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };
  const parseLocationText = (value) => {
    const [latText, lngText] = (value || "").split(",").map((item) => item.trim());
    const parsedLat = Number(latText);
    const parsedLng = Number(lngText);
    if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) return null;
    return { lat: parsedLat, lng: parsedLng };
  };
  const currentRole = roles.find((r) => r.id === selectedRole) || roles[0];

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (mode === "login") {
      setIsLoading(true);
      try {
        const identifier = isAdminLogin
          ? form.phone.trim().toLowerCase()
          : form.phone.includes("@")
            ? form.phone.trim().toLowerCase()
            : form.phone.startsWith("+91")
              ? form.phone
              : `+91${form.phone.replace(/\D/g, "")}`;
        const authData = await loginWithPhonePassword({
          identifier,
          password: form.password
        });
        onRegister(authData);
      } catch (loginError) {
        setError(
          loginError?.response?.data?.message || `Login failed. Check ${isAdminLogin ? "email" : "phone"} and password.`
        );
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (!selectedRole) {
      setError("Please select a role to continue.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    const parsedManualLocation = parseLocationText(form.location);
    const lat = Number.isFinite(Number(form.lat)) ? Number(form.lat) : parsedManualLocation?.lat;
    const lng = Number.isFinite(Number(form.lng)) ? Number(form.lng) : parsedManualLocation?.lng;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setError("Location is required. Use current location or enter as 'lat,lng'.");
      return;
    }

    setIsLoading(true);
    try {
      const normalizedPhone = form.phone.startsWith("+91") ? form.phone : `+91${form.phone.replace(/\D/g, "")}`;
      const authData = await registerUser({
        name: form.fullName || "AnnaDaan User",
        phone: normalizedPhone,
        role: selectedRole,
        password: form.password,
        lat,
        lng
      });
      onRegister(authData);
    } catch (submitError) {
      setError(submitError?.response?.data?.message || "Registration failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = () => {
    setMode((prev) => (prev === "register" ? "login" : "register"));
    setIsAdminLogin(false);
    setError("");
    setForm((prev) => ({ ...prev, phone: "", password: "", confirmPassword: "" }));
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-orange-50 via-amber-50 to-rose-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      <div className="pointer-events-none absolute left-[8%] top-[12%] text-4xl opacity-60 animate-[floatFood_4s_ease-in-out_infinite]">🍲</div>
      <div className="pointer-events-none absolute left-[40%] top-[22%] text-4xl opacity-60 animate-[floatFood_4.8s_ease-in-out_infinite]">🍛</div>
      <div className="pointer-events-none absolute left-[20%] bottom-[14%] text-4xl opacity-60 animate-[floatFood_5.2s_ease-in-out_infinite]">🥗</div>
      <div className="pointer-events-none absolute right-[12%] top-[18%] text-4xl opacity-60 animate-[floatFood_4.4s_ease-in-out_infinite]">🍱</div>

      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 px-4 py-6 lg:grid-cols-2 lg:gap-10 lg:px-8 lg:py-8">
        <section className="hidden lg:flex h-full flex-col justify-center">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-orange-600 dark:text-orange-300">Hyperlocal Food Surplus Network</p>
          <h1 className="text-6xl font-black tracking-tight text-slate-900 dark:text-slate-100 xl:text-7xl">
            ANNA<span className="text-orange-500">DAAN</span>
          </h1>
          <p className="mt-4 max-w-xl text-lg text-slate-600 dark:text-slate-300">
            Connect donors, NGOs, and volunteers to rescue surplus meals and deliver dignity across neighborhoods.
          </p>
          <div className={`mt-8 max-w-xl rounded-3xl border border-white/80 bg-gradient-to-r ${currentRole.panel} p-5 shadow-lg backdrop-blur dark:border-slate-700`}>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{currentRole.icon} {currentRole.label} Journey</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{currentRole.blurb}</p>
          </div>
        </section>

        <section className="flex h-full items-center justify-center lg:justify-end">
          <div className="w-full max-w-md rounded-3xl border border-white/70 bg-white/90 p-5 shadow-2xl backdrop-blur-xl animate-[fadeInUp_500ms_ease-out] dark:border-slate-700 dark:bg-slate-900/90 sm:p-6">
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                onClick={() => setTheme((prev) => (prev === "light" ? "dark" : "light"))}
                className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  theme === "light"
                    ? "border-slate-200 bg-white text-slate-700"
                    : "border-slate-700 bg-slate-800 text-slate-200"
                }`}
                aria-label="Toggle theme"
              >
                {theme === "light" ? <Moon size={14} /> : <Sun size={14} />}
                <span>{theme === "light" ? "Light" : "Dark"}</span>
              </button>
            </div>
            <div className="mb-6 text-center">
              <p className={`mb-1 text-sm font-semibold ${currentRole.accent}`}>✨ AnnaDaan</p>
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
                {mode === "register" ? "Create your account" : "Welcome back"}
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Share food, spread kindness</p>
            </div>

            {mode === "login" && isAdminLogin ? (
              <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-center text-sm font-semibold text-orange-700 dark:border-orange-800 dark:bg-orange-900/20 dark:text-orange-300">
                I&apos;m Admin
              </div>
            ) : null}

            <form onSubmit={onSubmit} className="space-y-4">
              {mode === "login" && isAdminLogin ? (
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Admin Name</label>
                  <input
                    type="text"
                    value={form.fullName}
                    onChange={(e) => onChange("fullName", e.target.value)}
                    placeholder="Owner name"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-800 placeholder:text-slate-400 outline-none transition-all duration-200 focus:border-pink-300 focus:ring-4 focus:ring-pink-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-pink-500/30"
                  />
                </div>
              ) : null}

              {mode === "login" ? (
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {isAdminLogin ? "Admin Number / Email" : "Phone Number"}
                  </label>
                  <input
                    type={isAdminLogin ? "text" : "tel"}
                    value={form.phone}
                    onChange={(e) => onChange("phone", e.target.value)}
                    placeholder={isAdminLogin ? "+91 99999 99999 or annadaan@gmail.com" : "+91 98765 43210"}
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-800 placeholder:text-slate-400 outline-none transition-all duration-200 focus:border-pink-300 focus:ring-4 focus:ring-pink-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-pink-500/30"
                  />
                </div>
              ) : null}

              {mode === "register" ? (
                <div>
                  <p className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Choose your role</p>
                  <div className="grid grid-cols-3 gap-2">
                    {roles.map((role) => {
                      const active = selectedRole === role.id;
                      return (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() => setSelectedRole(role.id)}
                          className={[
                            "group rounded-2xl px-2 py-3 text-center transition-all duration-200",
                            "border border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700",
                            active
                              ? `bg-gradient-to-br ${role.active} text-white shadow-lg ring-2 ${role.ring} scale-[1.02]`
                              : "text-slate-700 hover:scale-[1.01] dark:text-slate-200"
                          ].join(" ")}
                        >
                          <div className="text-lg">{role.icon}</div>
                          <div className="mt-1 text-xs font-semibold sm:text-sm">{role.label}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {mode === "register" ? (
                <div className={`overflow-hidden transition-all duration-300 ${selectedRole ? "max-h-[760px] opacity-100 translate-y-0" : "max-h-0 opacity-0 -translate-y-2"}`}>
                  {selectedRole ? (
                    <p className="mb-2 text-xs font-semibold text-orange-600 dark:text-orange-300">
                      Registering as {selectedRole.toUpperCase()}
                    </p>
                  ) : (
                    <p className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Select a role to unlock registration details.
                    </p>
                  )}
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Full Name</label>
                      <input
                        type="text"
                        value={form.fullName}
                        onChange={(e) => onChange("fullName", e.target.value)}
                        placeholder="Enter your full name"
                        required={!!selectedRole}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-800 placeholder:text-slate-400 outline-none transition-all duration-200 focus:border-orange-300 focus:ring-4 focus:ring-orange-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:ring-orange-500/30"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Phone Number</label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => onChange("phone", e.target.value)}
                        placeholder="+91 98765 43210"
                        required={!!selectedRole}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-800 placeholder:text-slate-400 outline-none transition-all duration-200 focus:border-pink-300 focus:ring-4 focus:ring-pink-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-pink-500/30"
                      />
                    </div>
                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Location</label>
                        <button
                          type="button"
                          onClick={fillCurrentLocation}
                          className="text-xs font-semibold text-orange-600 underline underline-offset-2 dark:text-orange-300"
                        >
                          Use current location
                        </button>
                      </div>
                      <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
                        Enter location manually or tap "Use current location".
                      </p>
                      <input
                        type="text"
                        value={form.location}
                        onChange={(e) => onChange("location", e.target.value)}
                        placeholder="Area or coordinates (e.g. 18.5204, 73.8567)"
                        required={!!selectedRole}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-800 placeholder:text-slate-400 outline-none transition-all duration-200 focus:border-pink-300 focus:ring-4 focus:ring-pink-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-pink-500/30"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Create Password</label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={form.password}
                          onChange={(e) => onChange("password", e.target.value)}
                          placeholder="Create password"
                          required={!!selectedRole}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-11 text-base text-slate-800 placeholder:text-slate-400 outline-none transition-all duration-200 focus:border-orange-300 focus:ring-4 focus:ring-orange-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-orange-500/30"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-300"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Confirm Password</label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          value={form.confirmPassword}
                          onChange={(e) => onChange("confirmPassword", e.target.value)}
                          placeholder="Re-enter password"
                          required={!!selectedRole}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-11 text-base text-slate-800 placeholder:text-slate-400 outline-none transition-all duration-200 focus:border-orange-300 focus:ring-4 focus:ring-orange-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-orange-500/30"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-300"
                          aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                        >
                          {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {mode === "login" ? (
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => onChange("password", e.target.value)}
                      placeholder="Enter your password"
                      required
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-11 text-base text-slate-800 placeholder:text-slate-400 outline-none transition-all duration-200 focus:border-orange-300 focus:ring-4 focus:ring-orange-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-orange-500/30"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-300"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              ) : null}

                <button
                  type="submit"
                  disabled={isLoading}
                className="mt-2 w-full rounded-2xl bg-gradient-to-r from-orange-500 via-pink-500 to-rose-500 px-4 py-3.5 text-base font-bold text-white shadow-xl transition-all duration-200 hover:scale-[1.02] hover:shadow-2xl disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isLoading ? (mode === "register" ? "Creating account..." : "Logging in...") : mode === "register" ? "Create Account" : "Login"}
              </button>
            </form>

            {error ? <p className="mt-3 rounded-xl bg-rose-100 px-3 py-2 text-xs font-medium text-rose-700 dark:bg-rose-900/40 dark:text-rose-200">{error}</p> : null}

            <p className="mt-5 text-center text-sm text-slate-600 dark:text-slate-300">
              {mode === "register" ? "Already have an account?" : "New to AnnaDaan?"}{" "}
              <button
                type="button"
                onClick={switchMode}
                className="font-semibold text-orange-600 underline decoration-orange-300 underline-offset-2 dark:text-orange-300 dark:decoration-orange-700"
              >
                {mode === "register" ? "Login" : "Register"}
              </button>
            </p>
            {mode === "register" ? (
              <div className="mt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setIsAdminLogin(true);
                    setError("");
                    setForm((prev) => ({ ...prev, fullName: "", phone: "", password: "", confirmPassword: "" }));
                  }}
                  className="text-xs font-semibold text-slate-500 underline decoration-slate-300 underline-offset-2 dark:text-slate-400 dark:decoration-slate-600"
                >
                  Login as Admin
                </button>
              </div>
            ) : null}
            {mode === "login" && isAdminLogin ? (
              <p className="mt-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400">
                Admin login enabled. Use owner number/email + password.
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
