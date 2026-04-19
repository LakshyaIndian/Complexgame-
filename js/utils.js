export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const deepClone = (value) => JSON.parse(JSON.stringify(value));

export function uid(prefix = "id") {
  const chunk = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${chunk}`;
}

export function shuffle(array) {
  const clone = [...array];
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
}

export function sample(array, count = 1) {
  return shuffle(array).slice(0, count);
}

export function weightedAverage(items) {
  if (!items.length) return 0;
  const total = items.reduce((sum, item) => sum + item, 0);
  return total / items.length;
}

export function formatDate(timestamp) {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(timestamp));
}

export function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function titleCase(value) {
  return value.replace(/[-_]/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

export function mapValues(object, mapper) {
  return Object.fromEntries(
    Object.entries(object).map(([key, value]) => [key, mapper(value, key)])
  );
}

export function sumObjectValues(object) {
  return Object.values(object).reduce((sum, value) => sum + value, 0);
}
