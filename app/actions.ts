"use server"

import { neon } from "@neondatabase/serverless"
import type { Filters, FilterValue } from "@/lib/types"

// ============================================
// CONFIGURATION & SETUP
// ============================================

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const DEFAULT_PAGE_SIZE = 50
const MAX_PAGE_SIZE = 500
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

type DataQueryParams = {
  page?: number
  pageSize?: number
  filters?: Filters
}

const normalizeFilters = (filters?: Filters): Filters => ({
  prospectDepartments: filters?.prospectDepartments ?? [],
  prospectLevels: filters?.prospectLevels ?? [],
  prospectCities: filters?.prospectCities ?? [],
  prospectTitleKeywords: filters?.prospectTitleKeywords ?? [],
  includeBlankDepartments: filters?.includeBlankDepartments ?? false,
  includeBlankLevels: filters?.includeBlankLevels ?? false,
  includeBlankCities: filters?.includeBlankCities ?? false,
})

const splitFilterValues = (filterArray: FilterValue[]) => {
  const include: string[] = []
  const exclude: string[] = []

  for (const filter of filterArray) {
    if (!filter.value) continue
    if (filter.mode === "exclude") {
      exclude.push(filter.value)
    } else {
      include.push(filter.value)
    }
  }

  return { include, exclude }
}

const buildFilterQuery = (filters: Filters) => {
  const clauses: string[] = []
  const params: any[] = []

  const addValueFilter = (column: string, filterArray: FilterValue[], includeBlanks: boolean) => {
    const { include, exclude } = splitFilterValues(filterArray)
    if (include.length > 0) {
      params.push(include)
      const includeClause = `${column} = ANY($${params.length})`
      if (includeBlanks) {
        clauses.push(`(${includeClause} OR ${column} IS NULL OR ${column} = '')`)
      } else {
        clauses.push(includeClause)
      }
    }
    if (exclude.length > 0) {
      params.push(exclude)
      clauses.push(`NOT (${column} = ANY($${params.length}))`)
    }
  }

  const addKeywordFilter = (column: string, filterArray: FilterValue[]) => {
    const { include, exclude } = splitFilterValues(filterArray)
    if (include.length > 0) {
      params.push(include.map((keyword) => `%${keyword}%`))
      clauses.push(`${column} ILIKE ANY($${params.length})`)
    }
    if (exclude.length > 0) {
      params.push(exclude.map((keyword) => `%${keyword}%`))
      clauses.push(`NOT (${column} ILIKE ANY($${params.length}))`)
    }
  }

  addValueFilter("department", filters.prospectDepartments, filters.includeBlankDepartments)
  addValueFilter("level", filters.prospectLevels, filters.includeBlankLevels)
  addValueFilter("city", filters.prospectCities, filters.includeBlankCities)
  addKeywordFilter("designation", filters.prospectTitleKeywords)

  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : ""

  return { whereClause, params }
}

const appendWhereCondition = (whereClause: string, condition: string) => {
  if (!whereClause) return `WHERE ${condition}`
  return `${whereClause} AND ${condition}`
}

export async function getProspects({ page = 1, pageSize = DEFAULT_PAGE_SIZE, filters }: DataQueryParams = {}) {
  try {
    if (!sql) {
      throw new Error("Database connection not initialized")
    }

    const safePageSize = Math.min(Math.max(pageSize, 1), MAX_PAGE_SIZE)
    const safePage = Math.max(page, 1)
    const normalizedFilters = normalizeFilters(filters)
    const { whereClause, params } = buildFilterQuery(normalizedFilters)
    const cacheKey = `prospects:${safePage}:${safePageSize}:${JSON.stringify(normalizedFilters)}`
    const cached = getCachedData(cacheKey)
    if (cached) return cached

    console.log("Fetching prospects from database...")
    const limitParam = params.length + 1
    const offsetParam = params.length + 2
    const offset = (safePage - 1) * safePageSize
    const query = `
      SELECT *
      FROM rnxt_db
      ${whereClause}
      ORDER BY last_name, first_name
      LIMIT $${limitParam}
      OFFSET $${offsetParam}
    `
    const prospects = await fetchWithRetry(() => sql.query(query, [...params, safePageSize, offset]))
    console.log(`Successfully fetched ${prospects.length} prospects`)

    setCachedData(cacheKey, prospects)
    return prospects
  } catch (error) {
    console.error("Error fetching prospects:", error)
    return []
  }
}

export async function getAllData({ page = 1, pageSize = DEFAULT_PAGE_SIZE, filters }: DataQueryParams = {}) {
  try {
    console.time("getAllData total")
    console.log("Starting to fetch prospects from database...")

    if (!process.env.DATABASE_URL) {
      console.error("DATABASE_URL environment variable is not set")
      return {
        prospects: [],
        filteredCount: 0,
        totalCount: 0,
        availableOptions: {
          prospectDepartments: [],
          prospectLevels: [],
          prospectCities: [],
        },
        error: "Database configuration missing",
      }
    }

    if (!sql) {
      console.error("Database connection not initialized")
      return {
        prospects: [],
        filteredCount: 0,
        totalCount: 0,
        availableOptions: {
          prospectDepartments: [],
          prospectLevels: [],
          prospectCities: [],
        },
        error: "Database connection failed",
      }
    }

    const safePageSize = Math.min(Math.max(pageSize, 1), MAX_PAGE_SIZE)
    const safePage = Math.max(page, 1)
    const normalizedFilters = normalizeFilters(filters)
    const { whereClause, params } = buildFilterQuery(normalizedFilters)
    const cacheKey = `all_data:${safePage}:${safePageSize}:${JSON.stringify(normalizedFilters)}`
    const cached = getCachedData(cacheKey)
    if (cached) {
      console.log("Returning all data from cache")
      return cached
    }

    console.time("getAllData prospects")
    const prospects = await getProspects({
      page: safePage,
      pageSize: safePageSize,
      filters: normalizedFilters,
    })
    console.timeEnd("getAllData prospects")

    const countQuery = `SELECT COUNT(*)::int AS count FROM rnxt_db ${whereClause}`
    const filteredCountRows = await fetchWithRetry(() => sql.query(countQuery, params))
    const filteredCount = filteredCountRows?.[0]?.count ?? 0

    const totalCountCacheKey = "total_count"
    let totalCount = getCachedData<number>(totalCountCacheKey)
    if (totalCount == null) {
      const totalCountRows = await fetchWithRetry(() => sql.query("SELECT COUNT(*)::int AS count FROM rnxt_db"))
      totalCount = totalCountRows?.[0]?.count ?? 0
      setCachedData(totalCountCacheKey, totalCount)
    }

    const departmentQuery = `
      SELECT department AS value, COUNT(*)::int AS count
      FROM rnxt_db
      ${appendWhereCondition(whereClause, "department IS NOT NULL AND department <> ''")}
      GROUP BY department
      ORDER BY count DESC
    `
    const levelQuery = `
      SELECT level AS value, COUNT(*)::int AS count
      FROM rnxt_db
      ${appendWhereCondition(whereClause, "level IS NOT NULL AND level <> ''")}
      GROUP BY level
      ORDER BY count DESC
    `
    const cityQuery = `
      SELECT city AS value, COUNT(*)::int AS count
      FROM rnxt_db
      ${appendWhereCondition(whereClause, "city IS NOT NULL AND city <> ''")}
      GROUP BY city
      ORDER BY count DESC
    `
    const [departmentCounts, levelCounts, cityCounts] = await Promise.all([
      fetchWithRetry(() => sql.query(departmentQuery, params)),
      fetchWithRetry(() => sql.query(levelQuery, params)),
      fetchWithRetry(() => sql.query(cityQuery, params)),
    ])

    console.log("Successfully fetched prospects:", {
      prospects: prospects.length,
      filteredCount,
      totalCount,
    })

    const allData = {
      prospects,
      filteredCount,
      totalCount,
      availableOptions: {
        prospectDepartments: departmentCounts ?? [],
        prospectLevels: levelCounts ?? [],
        prospectCities: cityCounts ?? [],
      },
      error: null,
    }

    setCachedData(cacheKey, allData)

    console.timeEnd("getAllData total")
    return allData
  } catch (error) {
    console.error("Error fetching all data:", error)
    return {
      prospects: [],
      filteredCount: 0,
      totalCount: 0,
      availableOptions: {
        prospectDepartments: [],
        prospectLevels: [],
        prospectCities: [],
      },
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
