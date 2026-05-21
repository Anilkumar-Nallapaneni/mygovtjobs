/* Job category metadata — counts come from computeJobAggregates(live jobs). */
export const CATS = [
  { id: "upsc", name: "UPSC", icon: "🏛️", color: "#FF6B00" },
  { id: "ssc", name: "SSC", icon: "📋", color: "#FFAA00" },
  { id: "railways", name: "Railways", icon: "🚂", color: "#22C55E" },
  { id: "banking", name: "Banking", icon: "🏦", color: "#38BDF8" },
  { id: "police", name: "Police", icon: "🚔", color: "#EF4444" },
  { id: "teaching", name: "Teaching", icon: "📚", color: "#A78BFA" },
  { id: "defence", name: "Defence", icon: "⚔️", color: "#34D399" },
  { id: "psu", name: "PSU", icon: "⚙️", color: "#FB923C" },
  { id: "health", name: "Health", icon: "🏥", color: "#F472B6" },
  { id: "state", name: "State PSC", icon: "🏢", color: "#67E8F9" },
] as const;

export type CategoryId = (typeof CATS)[number]["id"];
