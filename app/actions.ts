"use server"

import { neon } from "@neondatabase/serverless"

// ============================================
// CONFIGURATION & SETUP
// ============================================

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const dataCache = new Map<string, { data: any; timestamp: number }>()

let sql: any = null

try {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not configured")
  }
  sql = neon(process.env.DATABASE_URL, {
    fetchOptions: {
      cache: "no-store",
    },
  })
} catch (error) {
  console.error("Failed to initialize database connection:", error)
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function fetchWithRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error)
      if (i === retries - 1) throw error
      await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, i)))
    }
  }
  throw new Error("Max retries reached")
}

function getCachedData<T>(key: string): T | null {
  const cached = dataCache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`Cache hit for: ${key}`)
    return cached.data as T
  }
  return null
}

function setCachedData(key: string, data: any): void {
  dataCache.set(key, { data, timestamp: Date.now() })
  console.log(`Cache set for: ${key}`)
}

export async function clearCache() {
  dataCache.clear()
  console.log("Cache cleared")
  return { success: true, message: "Cache cleared successfully" }
}

// ============================================
// DATA FETCHING
// ============================================

export async function getProspects() {
  try {
    if (!sql) {
      throw new Error("Database connection not initialized")
    }

    const cacheKey = "prospects"
    const cached = getCachedData(cacheKey)
    if (cached) return cached

    console.log("Fetching prospects from database...")
    const prospects = await fetchWithRetry(
      () => sql`SELECT * FROM prospects ORDER BY prospect_last_name, prospect_first_name`
    )
    console.log(`Successfully fetched ${prospects.length} prospects`)

    setCachedData(cacheKey, prospects)
    return prospects
  } catch (error) {
    console.error("Error fetching prospects:", error)
    return []
  }
}

export async function getAllData() {
  try {
    console.time("getAllData total")
    console.log("Starting to fetch prospects from database...")

    if (!process.env.DATABASE_URL) {
      console.error("DATABASE_URL environment variable is not set")
      return {
        prospects: [],
        error: "Database configuration missing",
      }
    }

    if (!sql) {
      console.error("Database connection not initialized")
      return {
        prospects: [],
        error: "Database connection failed",
      }
    }

    const cacheKey = "all_data"
    const cached = getCachedData(cacheKey)
    if (cached) {
      console.log("Returning all data from cache")
      return cached
    }

    console.time("getAllData prospects")
    const prospects = await getProspects()
    console.timeEnd("getAllData prospects")

    console.log("Successfully fetched prospects:", {
      prospects: prospects.length,
    })

    const allData = {
      prospects,
      error: null,
    }

    setCachedData(cacheKey, allData)

    console.timeEnd("getAllData total")
    return allData
  } catch (error) {
    console.error("Error fetching all data:", error)
    return {
      prospects: [],
      error: error instanceof Error ? error.message : "Unknown database error",
    }
  }
}

// ============================================
// DATABASE HEALTH & DIAGNOSTICS
// ============================================

export async function testConnection() {
  try {
    if (!process.env.DATABASE_URL) {
      return {
        success: false,
        message: "DATABASE_URL environment variable is not configured",
      }
    }

    if (!sql) {
      return {
        success: false,
        message: "Database connection could not be initialized",
      }
    }

    console.log("Testing database connection...")
    const result = await fetchWithRetry(() => sql`SELECT 1 as test`)
    console.log("Database connection successful:", result)
    return { success: true, message: "Database connection successful" }
  } catch (error) {
    console.error("Database connection test failed:", error)
    return {
      success: false,
      message: `Connection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

export async function getDatabaseStatus() {
  try {
    const hasUrl = !!process.env.DATABASE_URL
    const hasConnection = !!sql

    return {
      hasUrl,
      hasConnection,
      urlLength: process.env.DATABASE_URL ? process.env.DATABASE_URL.length : 0,
      environment: process.env.NODE_ENV || "unknown",
      cacheSize: dataCache.size,
      cacheKeys: Array.from(dataCache.keys()),
    }
  } catch (error) {
    return {
      hasUrl: false,
      hasConnection: false,
      urlLength: 0,
      environment: "unknown",
      cacheSize: 0,
      cacheKeys: [],
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
