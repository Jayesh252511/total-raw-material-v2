export const fmtINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(
    Number.isFinite(n) ? n : 0,
  );

export const fmtNum = (n: number, digits = 2) =>
  new Intl.NumberFormat("en-IN", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(
    Number.isFinite(n) ? n : 0,
  );

export const fmtTons = (n: number) => `${fmtNum(n, 3)} t`;

export const todayStr = () => new Date().toISOString().slice(0, 10);

export const isToday = (d: string) => d === todayStr();

export const isThisMonth = (d: string) => {
  const now = new Date();
  const dt = new Date(d);
  return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth();
};

export const isThisYear = (d: string) => {
  const now = new Date();
  const dt = new Date(d);
  return dt.getFullYear() === now.getFullYear();
};

export const SELL_GST_RATE = 0.05;
export const withGst = (n: number) => n * (1 + SELL_GST_RATE);

export const formatDate = (dateStr: string) => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const year = parts[0].slice(-2);
    const month = parts[1];
    const day = parts[2];
    return `${day}-${month}-${year}`;
  }
  return dateStr;
};

