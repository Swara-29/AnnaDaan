const QUEUE_KEY = "annadaan_offline_queue";

export const queueAction = (action) => {
  const existing = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  localStorage.setItem(QUEUE_KEY, JSON.stringify([...existing, action]));
};

export const consumeQueue = () => {
  const existing = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  localStorage.removeItem(QUEUE_KEY);
  return existing;
};
