import { create } from "zustand";

export const useAppStore = create((set) => ({
  user: null,
  token: null,
  language: "en",
  notifications: [],
  donations: [],
  setAuth: ({ user, token }) => set({ user, token, donations: [], notifications: [] }),
  clearAuth: () => set({ user: null, token: null, donations: [], notifications: [] }),
  setLanguage: (language) => set({ language }),
  addNotification: (notification) =>
    set((state) => ({
      notifications: [
        {
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          read: false,
          ...notification
        },
        ...state.notifications
      ].slice(0, 40)
    })),
  markAllNotificationsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((item) => ({ ...item, read: true }))
    })),
  setDonations: (donations) => set({ donations }),
  addDonation: (donation) =>
    set((state) => ({
      donations: [{ ...donation, _id: donation._id || crypto.randomUUID(), status: donation.status || "pending" }, ...state.donations]
    })),
  upsertDonation: (donation) =>
    set((state) => {
      const incomingId = donation?._id?.toString();
      if (!incomingId) return state;
      const existingIndex = state.donations.findIndex((item) => item._id?.toString() === incomingId);
      if (existingIndex === -1) {
        return { donations: [donation, ...state.donations] };
      }
      const next = [...state.donations];
      next[existingIndex] = { ...next[existingIndex], ...donation };
      return { donations: next };
    }),
  updateDonationStatus: (id, status) =>
    set((state) => ({
      donations: state.donations.map((d) => (d._id?.toString() === id?.toString() ? { ...d, status } : d))
    }))
}));
