export function displayValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "number" && Number.isNaN(value)) return "-";
  if (typeof value === "string" && value.trim() === "") return "-";
  return String(value);
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const d = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatIstTime(value: Date | string | null | undefined): string {
  const d = toDate(value);
  if (!d) return "-";
  return d.toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function formatIstDateTime(value: Date | string | null | undefined): string {
  const d = toDate(value);
  if (!d) return "-";
  return d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
}

export function formatIstDate(value: Date | string | null | undefined): string {
  const d = toDate(value);
  if (!d) return "-";
  return d.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "2-digit", year: "numeric" });
}
