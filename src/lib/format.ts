export const fmtINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(
    Number.isFinite(n) ? n : 0,
  );

export const fmtNum = (n: number, digits = 2) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: digits }).format(Number.isFinite(n) ? n : 0);

export const fmtTons = (n: number) => `${fmtNum(n, 3)} t`;

export const todayStr = () => new Date().toISOString().slice(0, 10);

export const isToday = (d: string) => d === todayStr();

export const isThisMonth = (d: string) => {
  const now = new Date();
  const dt = new Date(d);
  return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth();
};
