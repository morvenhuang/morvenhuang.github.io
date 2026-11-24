const englishMonths = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

export function normalizePublicationDate(value) {
  if (typeof value !== "string") return "";

  const input = value.trim();
  const legacy = /^([a-z]{3,9}) (\d{1,2}), (\d{4})$/i.exec(input);
  let day = input.replace(/^(\d{4})(\d{2})(\d{2})$/, "$1-$2-$3");
  if (legacy) {
    const [, monthName, dayOfMonth, year] = legacy;
    const name = monthName.toLowerCase();
    const month = englishMonths.findIndex(month => month === name || month.slice(0, 3) === name) + 1;
    day = `${year}-${String(month).padStart(2, "0")}-${dayOfMonth.padStart(2, "0")}`;
  } else if (/^\d{4}-\d{2}-\d{2}T/.test(input) && Number.isFinite(Date.parse(input))) {
    day = input.slice(0, 10);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day.startsWith("0000")) return "";

  const date = new Date(day + "T00:00:00Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === day ? day : "";
}

export function todayPublicationDate() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function getPublicationDate(post) {
  return normalizePublicationDate(post.date)
    || normalizePublicationDate(post.createdAt)
    || normalizePublicationDate(post.updatedAt);
}

export function formatPublicationDate(post) {
  const day = getPublicationDate(post);
  return day ? new Date(day + "T00:00:00Z").toLocaleDateString("en-US", {
    timeZone: "UTC", month: "short", day: "numeric", year: "numeric",
  }) : "";
}

export function comparePublicationDates(a, b) {
  const byPublication = getPublicationDate(b).localeCompare(getPublicationDate(a));
  return byPublication || (Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0);
}
