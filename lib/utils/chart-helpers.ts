import type { ChartData } from "../types"

// Color palette for charts
export const CHART_COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
  "#14b8a6", // teal
  "#6366f1", // indigo
  "#84cc16", // lime
  "#a855f7", // purple
  "#f43f5e", // rose
  "#22d3ee", // sky
  "#facc15", // yellow
]

/**
 * Calculate chart data for a generic field.
 */
export const calculateChartData = <T, K extends keyof T>(records: T[], field: K): ChartData[] => {
  const counts = new Map<string, number>()

  records.forEach((record) => {
    const value = record[field] ?? "Unknown"
    const label = typeof value === "string" ? value : String(value)
    counts.set(label, (counts.get(label) || 0) + 1)
  })

  return Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10) // Top 10 for better readability
}
