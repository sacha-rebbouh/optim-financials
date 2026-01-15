const SOURCE_HINTS = [
  { key: "isracard", label: "Isracard", tokens: ["isracard", "ישראכרט"] },
  { key: "max", label: "Max", tokens: ["max", "מקס"] },
  { key: "visa", label: "Visa", tokens: ["visa", "ויזה"] },
  {
    key: "mizrahi",
    label: "Mizrahi-Tefahot",
    tokens: ["מזרחי", "טפחות", "mizrahi", "tefahot"],
  },
  { key: "bank", label: "Banque (générique)", tokens: ["bank", "banque"] },
];

export function detectSource(filename: string): {
  key: string;
  label: string;
} {
  const lower = filename.toLowerCase();

  for (const hint of SOURCE_HINTS) {
    if (hint.tokens.some((token) => lower.includes(token))) {
      return { key: hint.key, label: hint.label };
    }
  }

  return { key: "unknown", label: "Source inconnue" };
}
