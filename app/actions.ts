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

type FilterQueryParams = {
  filters?: Filters
}

const normalizeFilters = (filters?: Filters): Filters => ({
  prospectAccountNames: filters?.prospectAccountNames ?? [],
  prospectRnxtDataTypes: filters?.prospectRnxtDataTypes ?? [],
  prospectProjectNames: filters?.prospectProjectNames ?? [],
  prospectDupeStatuses: filters?.prospectDupeStatuses ?? [],
  prospectSfTalStatuses: filters?.prospectSfTalStatuses ?? [],
  prospectSfIndustries: filters?.prospectSfIndustries ?? [],
  prospectContactsTypes: filters?.prospectContactsTypes ?? [],
  prospectDepartments: filters?.prospectDepartments ?? [],
  prospectLevels: filters?.prospectLevels ?? [],
  prospectOptizmoSuppressions: filters?.prospectOptizmoSuppressions ?? [],
  prospectCities: filters?.prospectCities ?? [],
  prospectCountries: filters?.prospectCountries ?? [],
  prospectTitleKeywords: filters?.prospectTitleKeywords ?? [],
  includeBlankAccountNames: filters?.includeBlankAccountNames ?? false,
  includeBlankRnxtDataTypes: filters?.includeBlankRnxtDataTypes ?? false,
  includeBlankProjectNames: filters?.includeBlankProjectNames ?? false,
  includeBlankDupeStatuses: filters?.includeBlankDupeStatuses ?? false,
  includeBlankSfTalStatuses: filters?.includeBlankSfTalStatuses ?? false,
  includeBlankSfIndustries: filters?.includeBlankSfIndustries ?? false,
  includeBlankContactsTypes: filters?.includeBlankContactsTypes ?? false,
  includeBlankDepartments: filters?.includeBlankDepartments ?? false,
  includeBlankLevels: filters?.includeBlankLevels ?? false,
  includeBlankOptizmoSuppressions: filters?.includeBlankOptizmoSuppressions ?? false,
  includeBlankCities: filters?.includeBlankCities ?? false,
  includeBlankCountries: filters?.includeBlankCountries ?? false,
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

  addValueFilter("account_name", filters.prospectAccountNames, filters.includeBlankAccountNames)
  addValueFilter("rnxt_data_type", filters.prospectRnxtDataTypes, filters.includeBlankRnxtDataTypes)
  addValueFilter("project_name", filters.prospectProjectNames, filters.includeBlankProjectNames)
  addValueFilter("dupe_status", filters.prospectDupeStatuses, filters.includeBlankDupeStatuses)
  addValueFilter("sf_tal_status", filters.prospectSfTalStatuses, filters.includeBlankSfTalStatuses)
  addValueFilter("sf_industry", filters.prospectSfIndustries, filters.includeBlankSfIndustries)
  addValueFilter("contacts_type", filters.prospectContactsTypes, filters.includeBlankContactsTypes)
  addValueFilter("department", filters.prospectDepartments, filters.includeBlankDepartments)
  addValueFilter("level", filters.prospectLevels, filters.includeBlankLevels)
  addValueFilter("optizmo_supression", filters.prospectOptizmoSuppressions, filters.includeBlankOptizmoSuppressions)
  addValueFilter("city", filters.prospectCities, filters.includeBlankCities)
  addValueFilter("country", filters.prospectCountries, filters.includeBlankCountries)
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

export async function getCounts({ filters }: FilterQueryParams = {}) {
  try {
    if (!process.env.DATABASE_URL) {
      console.error("DATABASE_URL environment variable is not set")
      return { filteredCount: 0, totalCount: 0, error: "Database configuration missing" }
    }

    if (!sql) {
      console.error("Database connection not initialized")
      return { filteredCount: 0, totalCount: 0, error: "Database connection failed" }
    }

    const normalizedFilters = normalizeFilters(filters)
    const { whereClause, params } = buildFilterQuery(normalizedFilters)
    const filteredCountCacheKey = `filtered_count:${JSON.stringify(normalizedFilters)}`
    const cachedFilteredCount = getCachedData<number>(filteredCountCacheKey)

    let filteredCount = cachedFilteredCount ?? 0
    if (cachedFilteredCount == null) {
      const countQuery = `SELECT COUNT(*)::int AS count FROM rnxt_db ${whereClause}`
      const filteredCountRows = await fetchWithRetry(() => sql.query(countQuery, params))
      filteredCount = filteredCountRows?.[0]?.count ?? 0
      setCachedData(filteredCountCacheKey, filteredCount)
    }

    const totalCountCacheKey = "total_count"
    let totalCount = getCachedData<number>(totalCountCacheKey)
    if (totalCount == null) {
      const totalCountRows = await fetchWithRetry(() => sql.query("SELECT COUNT(*)::int AS count FROM rnxt_db"))
      totalCount = totalCountRows?.[0]?.count ?? 0
      setCachedData(totalCountCacheKey, totalCount)
    }

    return { filteredCount, totalCount, error: null }
  } catch (error) {
    console.error("Error fetching counts:", error)
    return {
      filteredCount: 0,
      totalCount: 0,
      error: error instanceof Error ? error.message : "Unknown database error",
    }
  }
}

export async function getFilterOptions({ filters }: FilterQueryParams = {}) {
  try {
    if (!process.env.DATABASE_URL) {
      console.error("DATABASE_URL environment variable is not set")
      return {
        availableOptions: {
          prospectAccountNames: [],
          prospectRnxtDataTypes: [],
          prospectProjectNames: [],
          prospectDupeStatuses: [],
          prospectSfTalStatuses: [],
          prospectSfIndustries: [],
          prospectContactsTypes: [],
          prospectDepartments: [],
          prospectLevels: [],
          prospectOptizmoSuppressions: [],
          prospectCities: [],
          prospectCountries: [],
        },
        error: "Database configuration missing",
      }
    }

    if (!sql) {
      console.error("Database connection not initialized")
      return {
        availableOptions: {
          prospectAccountNames: [],
          prospectRnxtDataTypes: [],
          prospectProjectNames: [],
          prospectDupeStatuses: [],
          prospectSfTalStatuses: [],
          prospectSfIndustries: [],
          prospectContactsTypes: [],
          prospectDepartments: [],
          prospectLevels: [],
          prospectOptizmoSuppressions: [],
          prospectCities: [],
          prospectCountries: [],
        },
        error: "Database connection failed",
      }
    }

    const normalizedFilters = normalizeFilters(filters)
    const { whereClause, params } = buildFilterQuery(normalizedFilters)
    const cacheKey = `filter_options:${JSON.stringify(normalizedFilters)}`
    const cached = getCachedData<any>(cacheKey)
    if (cached) {
      console.log("Returning filter options from cache")
      return cached
    }

    const accountNameQuery = `
      SELECT account_name AS value, COUNT(*)::int AS count
      FROM rnxt_db
      ${appendWhereCondition(whereClause, "account_name IS NOT NULL AND account_name <> ''")}
      GROUP BY account_name
      ORDER BY count DESC
    `
    const rnxtDataTypeQuery = `
      SELECT rnxt_data_type AS value, COUNT(*)::int AS count
      FROM rnxt_db
      ${appendWhereCondition(whereClause, "rnxt_data_type IS NOT NULL AND rnxt_data_type <> ''")}
      GROUP BY rnxt_data_type
      ORDER BY count DESC
    `
    const projectNameQuery = `
      SELECT project_name AS value, COUNT(*)::int AS count
      FROM rnxt_db
      ${appendWhereCondition(whereClause, "project_name IS NOT NULL AND project_name <> ''")}
      GROUP BY project_name
      ORDER BY count DESC
    `
    const dupeStatusQuery = `
      SELECT dupe_status AS value, COUNT(*)::int AS count
      FROM rnxt_db
      ${appendWhereCondition(whereClause, "dupe_status IS NOT NULL AND dupe_status <> ''")}
      GROUP BY dupe_status
      ORDER BY count DESC
    `
    const sfTalStatusQuery = `
      SELECT sf_tal_status AS value, COUNT(*)::int AS count
      FROM rnxt_db
      ${appendWhereCondition(whereClause, "sf_tal_status IS NOT NULL AND sf_tal_status <> ''")}
      GROUP BY sf_tal_status
      ORDER BY count DESC
    `
    const sfIndustryQuery = `
      SELECT sf_industry AS value, COUNT(*)::int AS count
      FROM rnxt_db
      ${appendWhereCondition(whereClause, "sf_industry IS NOT NULL AND sf_industry <> ''")}
      GROUP BY sf_industry
      ORDER BY count DESC
    `
    const contactsTypeQuery = `
      SELECT contacts_type AS value, COUNT(*)::int AS count
      FROM rnxt_db
      ${appendWhereCondition(whereClause, "contacts_type IS NOT NULL AND contacts_type <> ''")}
      GROUP BY contacts_type
      ORDER BY count DESC
    `
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
    const optizmoSuppressionQuery = `
      SELECT optizmo_supression AS value, COUNT(*)::int AS count
      FROM rnxt_db
      ${appendWhereCondition(whereClause, "optizmo_supression IS NOT NULL AND optizmo_supression <> ''")}
      GROUP BY optizmo_supression
      ORDER BY count DESC
    `
    const cityQuery = `
      SELECT city AS value, COUNT(*)::int AS count
      FROM rnxt_db
      ${appendWhereCondition(whereClause, "city IS NOT NULL AND city <> ''")}
      GROUP BY city
      ORDER BY count DESC
    `
    const countryQuery = `
      SELECT country AS value, COUNT(*)::int AS count
      FROM rnxt_db
      ${appendWhereCondition(whereClause, "country IS NOT NULL AND country <> ''")}
      GROUP BY country
      ORDER BY count DESC
    `

    const [
      accountNameCounts,
      rnxtDataTypeCounts,
      projectNameCounts,
      dupeStatusCounts,
      sfTalStatusCounts,
      sfIndustryCounts,
      contactsTypeCounts,
      departmentCounts,
      levelCounts,
      optizmoSuppressionCounts,
      cityCounts,
      countryCounts,
    ] = await Promise.all([
      fetchWithRetry(() => sql.query(accountNameQuery, params)),
      fetchWithRetry(() => sql.query(rnxtDataTypeQuery, params)),
      fetchWithRetry(() => sql.query(projectNameQuery, params)),
      fetchWithRetry(() => sql.query(dupeStatusQuery, params)),
      fetchWithRetry(() => sql.query(sfTalStatusQuery, params)),
      fetchWithRetry(() => sql.query(sfIndustryQuery, params)),
      fetchWithRetry(() => sql.query(contactsTypeQuery, params)),
      fetchWithRetry(() => sql.query(departmentQuery, params)),
      fetchWithRetry(() => sql.query(levelQuery, params)),
      fetchWithRetry(() => sql.query(optizmoSuppressionQuery, params)),
      fetchWithRetry(() => sql.query(cityQuery, params)),
      fetchWithRetry(() => sql.query(countryQuery, params)),
    ])

    const allOptions = {
      availableOptions: {
        prospectAccountNames: accountNameCounts ?? [],
        prospectRnxtDataTypes: rnxtDataTypeCounts ?? [],
        prospectProjectNames: projectNameCounts ?? [],
        prospectDupeStatuses: dupeStatusCounts ?? [],
        prospectSfTalStatuses: sfTalStatusCounts ?? [],
        prospectSfIndustries: sfIndustryCounts ?? [],
        prospectContactsTypes: contactsTypeCounts ?? [],
        prospectDepartments: departmentCounts ?? [],
        prospectLevels: levelCounts ?? [],
        prospectOptizmoSuppressions: optizmoSuppressionCounts ?? [],
        prospectCities: cityCounts ?? [],
        prospectCountries: countryCounts ?? [],
      },
      error: null,
    }

    setCachedData(cacheKey, allOptions)
    return allOptions
  } catch (error) {
    console.error("Error fetching filter options:", error)
    return {
      availableOptions: {
        prospectAccountNames: [],
        prospectRnxtDataTypes: [],
        prospectProjectNames: [],
        prospectDupeStatuses: [],
        prospectSfTalStatuses: [],
        prospectSfIndustries: [],
        prospectContactsTypes: [],
        prospectDepartments: [],
        prospectLevels: [],
        prospectOptizmoSuppressions: [],
        prospectCities: [],
        prospectCountries: [],
      },
      error: error instanceof Error ? error.message : "Unknown database error",
    }
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
          prospectAccountNames: [],
          prospectRnxtDataTypes: [],
          prospectProjectNames: [],
          prospectDupeStatuses: [],
          prospectSfTalStatuses: [],
          prospectSfIndustries: [],
          prospectContactsTypes: [],
          prospectDepartments: [],
          prospectLevels: [],
          prospectOptizmoSuppressions: [],
          prospectCities: [],
          prospectCountries: [],
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
          prospectAccountNames: [],
          prospectRnxtDataTypes: [],
          prospectProjectNames: [],
          prospectDupeStatuses: [],
          prospectSfTalStatuses: [],
          prospectSfIndustries: [],
          prospectContactsTypes: [],
          prospectDepartments: [],
          prospectLevels: [],
          prospectOptizmoSuppressions: [],
          prospectCities: [],
          prospectCountries: [],
        },
        error: "Database connection failed",
      }
    }

    const safePageSize = Math.min(Math.max(pageSize, 1), MAX_PAGE_SIZE)
    const safePage = Math.max(page, 1)
    const normalizedFilters = normalizeFilters(filters)
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

    const counts = await getCounts({ filters: normalizedFilters })
    const options = await getFilterOptions({ filters: normalizedFilters })

    console.log("Successfully fetched prospects:", {
      prospects: prospects.length,
      filteredCount: counts.filteredCount,
      totalCount: counts.totalCount,
    })

    const allData = {
      prospects,
      filteredCount: counts.filteredCount,
      totalCount: counts.totalCount,
      availableOptions: options.availableOptions,
      error: counts.error ?? options.error ?? null,
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
        prospectAccountNames: [],
        prospectRnxtDataTypes: [],
        prospectProjectNames: [],
        prospectDupeStatuses: [],
        prospectSfTalStatuses: [],
        prospectSfIndustries: [],
        prospectContactsTypes: [],
        prospectDepartments: [],
        prospectLevels: [],
        prospectOptizmoSuppressions: [],
        prospectCities: [],
        prospectCountries: [],
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
