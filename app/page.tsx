"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import { FiltersSidebar } from "@/components/filters/filters-sidebar"
import { SummaryCards } from "@/components/dashboard/summary-cards"
import { ProspectsTab } from "@/components/tabs/prospects-tab"
import { LoadingState } from "@/components/states/loading-state"
import { ErrorState } from "@/components/states/error-state"
import { getProspects, getCounts, getFilterOptions, testConnection, getDatabaseStatus, clearCache } from "./actions"
import { exportToExcel } from "@/lib/utils/export-helpers"
import type { Prospect, Filters, AvailableOptions, BlankCounts } from "@/lib/types"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

function DashboardContent() {
  const router = useRouter()
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [pageLoading, setPageLoading] = useState(true)
  const [countsLoading, setCountsLoading] = useState(true)
  const [optionsLoading, setOptionsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<string>("")
  const [dbStatus, setDbStatus] = useState<any>(null)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [connectionChecked, setConnectionChecked] = useState(false)
  const connectionCheckRef = useRef<Promise<boolean> | null>(null)
  const [availableOptions, setAvailableOptions] = useState<AvailableOptions>({
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
  })
  const [blankCounts, setBlankCounts] = useState<BlankCounts>({
    prospectAccountNames: 0,
    prospectRnxtDataTypes: 0,
    prospectProjectNames: 0,
    prospectDupeStatuses: 0,
    prospectSfTalStatuses: 0,
    prospectSfIndustries: 0,
    prospectContactsTypes: 0,
    prospectDepartments: 0,
    prospectLevels: 0,
    prospectOptizmoSuppressions: 0,
    prospectCities: 0,
    prospectCountries: 0,
  })
  const [filteredCount, setFilteredCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [filters, setFilters] = useState<Filters>({
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
    prospectTitleKeywords: [],
    includeBlankAccountNames: false,
    includeBlankRnxtDataTypes: false,
    includeBlankProjectNames: false,
    includeBlankDupeStatuses: false,
    includeBlankSfTalStatuses: false,
    includeBlankSfIndustries: false,
    includeBlankContactsTypes: false,
    includeBlankDepartments: false,
    includeBlankLevels: false,
    includeBlankOptizmoSuppressions: false,
    includeBlankCities: false,
    includeBlankCountries: false,
  })
  const [pendingFilters, setPendingFilters] = useState<Filters>({
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
    prospectTitleKeywords: [],
    includeBlankAccountNames: false,
    includeBlankRnxtDataTypes: false,
    includeBlankProjectNames: false,
    includeBlankDupeStatuses: false,
    includeBlankSfTalStatuses: false,
    includeBlankSfIndustries: false,
    includeBlankContactsTypes: false,
    includeBlankDepartments: false,
    includeBlankLevels: false,
    includeBlankOptizmoSuppressions: false,
    includeBlankCities: false,
    includeBlankCountries: false,
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(50)
  const [authReady, setAuthReady] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const filterDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const previousFiltersRef = useRef<Filters | null>(null)
  const exportPageSize = 500
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number } | null>(null)
  const filterLoading = countsLoading || optionsLoading

  const checkDatabaseStatus = useCallback(async () => {
    try {
      const status = await getDatabaseStatus()
      setDbStatus(status)
      console.log("Database status:", status)
      return status
    } catch (err) {
      console.error("Failed to check database status:", err)
      return null
    }
  }, [])

  const testDatabaseConnection = useCallback(async () => {
    try {
      const result = await testConnection()
      setConnectionStatus(result.message)
      return result.success
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Connection test failed"
      setConnectionStatus(errorMessage)
      return false
    }
  }, [])

  const ensureConnection = useCallback(async () => {
    if (connectionChecked) return true
    if (connectionCheckRef.current) return connectionCheckRef.current

    connectionCheckRef.current = (async () => {
      setConnectionStatus("Checking database configuration...")
      console.time("dashboard checkDatabaseStatus")
      const status = await checkDatabaseStatus()
      console.timeEnd("dashboard checkDatabaseStatus")
      setDbStatus(status)

      if (status && !status.hasUrl) {
        setError("Database URL not configured. Please check environment variables.")
        setConnectionStatus("Database URL missing")
        connectionCheckRef.current = null
        return false
      }

      if (status && !status.hasConnection) {
        setError("Database connection could not be initialized.")
        setConnectionStatus("Connection initialization failed")
        connectionCheckRef.current = null
        return false
      }

      setConnectionStatus("Testing database connection...")
      console.time("dashboard testDatabaseConnection")
      const connectionOk = await testDatabaseConnection()
      console.timeEnd("dashboard testDatabaseConnection")
      if (!connectionOk) {
        setError("Database connection test failed. Please check your database configuration.")
        connectionCheckRef.current = null
        return false
      }

      setConnectionChecked(true)
      connectionCheckRef.current = null
      return true
    })()

    return connectionCheckRef.current
  }, [checkDatabaseStatus, testDatabaseConnection, connectionChecked])

  const loadPageData = useCallback(async () => {
    console.time("dashboard loadPageData total")
    try {
      setPageLoading(true)
      setError(null)

      const connectionOk = await ensureConnection()
      if (!connectionOk) return

      setConnectionStatus("Loading prospects from database...")
      console.time("dashboard getProspects")
      const prospectsData = await getProspects({
        page: currentPage,
        pageSize: itemsPerPage,
        filters,
      })
      console.timeEnd("dashboard getProspects")

      const normalizedProspects = Array.isArray(prospectsData) ? prospectsData : []
      setProspects(normalizedProspects as Prospect[])
      setConnectionStatus(`Successfully loaded: ${normalizedProspects.length} prospects`)
      setHasLoadedOnce(true)
    } catch (err) {
      console.error("Error loading page data:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to load data from database"
      setError(errorMessage)
      setConnectionStatus("Database connection failed")
    } finally {
      setPageLoading(false)
      console.timeEnd("dashboard loadPageData total")
    }
  }, [currentPage, itemsPerPage, filters, ensureConnection])

  const loadCounts = useCallback(async () => {
    console.time("dashboard loadCounts total")
    try {
      setCountsLoading(true)
      const connectionOk = await ensureConnection()
      if (!connectionOk) return

      setConnectionStatus("Loading counts...")
      const counts = await getCounts({ filters })

      if (counts.error) {
        setError(`Database error: ${counts.error}`)
        setConnectionStatus("Counts loading failed")
        return
      }

      setFilteredCount(counts.filteredCount ?? 0)
      setTotalCount(counts.totalCount ?? 0)
    } catch (err) {
      console.error("Error loading counts:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to load data from database"
      setError(errorMessage)
      setConnectionStatus("Database connection failed")
    } finally {
      setCountsLoading(false)
      console.timeEnd("dashboard loadCounts total")
    }
  }, [filters, ensureConnection])

  const loadFilterOptions = useCallback(async (filtersOverride?: Filters) => {
    console.time("dashboard loadFilterOptions total")
    try {
      setOptionsLoading(true)
      const connectionOk = await ensureConnection()
      if (!connectionOk) return

      setConnectionStatus("Loading filter options...")
      const options = await getFilterOptions(
        filtersOverride ? { filters: filtersOverride } : undefined
      )

      if (options.error) {
        setError(`Database error: ${options.error}`)
        setConnectionStatus("Filter options loading failed")
        return
      }

      setAvailableOptions(
        options.availableOptions || {
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
        }
      )
      setBlankCounts(
        options.blankCounts || {
          prospectAccountNames: 0,
          prospectRnxtDataTypes: 0,
          prospectProjectNames: 0,
          prospectDupeStatuses: 0,
          prospectSfTalStatuses: 0,
          prospectSfIndustries: 0,
          prospectContactsTypes: 0,
          prospectDepartments: 0,
          prospectLevels: 0,
          prospectOptizmoSuppressions: 0,
          prospectCities: 0,
          prospectCountries: 0,
        }
      )
    } catch (err) {
      console.error("Error loading filter options:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to load data from database"
      setError(errorMessage)
      setConnectionStatus("Database connection failed")
    } finally {
      setOptionsLoading(false)
      console.timeEnd("dashboard loadFilterOptions total")
    }
  }, [ensureConnection])

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    let isMounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return
      const session = data.session
      if (!session) {
        router.replace("/signin")
        setAuthReady(true)
        return
      }
      setUserId(session.user.id)
      setAuthReady(true)
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return
      if (!session) {
        setUserId(null)
        router.replace("/signin")
        return
      }
      setUserId(session.user.id)
    })

    return () => {
      isMounted = false
      authListener.subscription.unsubscribe()
    }
  }, [router])

  useEffect(() => {
    if (!authReady || !userId) return
    loadFilterOptions()
  }, [authReady, userId, loadFilterOptions])

  useEffect(() => {
    if (!authReady || !userId) return
    loadCounts()
  }, [authReady, userId, filters, loadCounts])

  useEffect(() => {
    if (!authReady || !userId) return
    const filtersChanged = previousFiltersRef.current !== filters
    if (filtersChanged) {
      previousFiltersRef.current = filters
      if (currentPage !== 1) {
        setCurrentPage(1)
        return
      }
    }
    loadPageData()
  }, [authReady, userId, filters, currentPage, loadPageData])

  useEffect(() => {
    if (filterDebounceRef.current) {
      clearTimeout(filterDebounceRef.current)
    }
    filterDebounceRef.current = setTimeout(() => {
      setFilters(pendingFilters)
    }, 300)

    return () => {
      if (filterDebounceRef.current) {
        clearTimeout(filterDebounceRef.current)
      }
    }
  }, [pendingFilters])

  const handleClearCache = async () => {
    try {
      setConnectionStatus("Clearing cache...")
      await clearCache()
      await Promise.all([
        loadFilterOptions(filters),
        loadCounts(),
        loadPageData(),
      ])
    } catch (err) {
      console.error("Error clearing cache:", err)
      setError("Failed to clear cache")
    }
  }

  const handleRetry = useCallback(async () => {
    setError(null)
    await Promise.all([
      loadFilterOptions(filters),
      loadCounts(),
      loadPageData(),
    ])
  }, [filters, loadFilterOptions, loadCounts, loadPageData])

  const getTotalActiveFilters = () => {
    return (
      pendingFilters.prospectAccountNames.length +
      pendingFilters.prospectRnxtDataTypes.length +
      pendingFilters.prospectProjectNames.length +
      pendingFilters.prospectDupeStatuses.length +
      pendingFilters.prospectSfTalStatuses.length +
      pendingFilters.prospectSfIndustries.length +
      pendingFilters.prospectContactsTypes.length +
      pendingFilters.prospectDepartments.length +
      pendingFilters.prospectLevels.length +
      pendingFilters.prospectOptizmoSuppressions.length +
      pendingFilters.prospectCities.length +
      pendingFilters.prospectCountries.length +
      pendingFilters.prospectTitleKeywords.length +
      (pendingFilters.includeBlankAccountNames ? 1 : 0) +
      (pendingFilters.includeBlankRnxtDataTypes ? 1 : 0) +
      (pendingFilters.includeBlankProjectNames ? 1 : 0) +
      (pendingFilters.includeBlankDupeStatuses ? 1 : 0) +
      (pendingFilters.includeBlankSfTalStatuses ? 1 : 0) +
      (pendingFilters.includeBlankSfIndustries ? 1 : 0) +
      (pendingFilters.includeBlankContactsTypes ? 1 : 0) +
      (pendingFilters.includeBlankDepartments ? 1 : 0) +
      (pendingFilters.includeBlankLevels ? 1 : 0) +
      (pendingFilters.includeBlankOptizmoSuppressions ? 1 : 0) +
      (pendingFilters.includeBlankCities ? 1 : 0) +
      (pendingFilters.includeBlankCountries ? 1 : 0)
    )
  }

  const handleLoadSavedFilters = (savedFilters: Filters) => {
    setPendingFilters(savedFilters)
    setFilters(savedFilters)
  }

  const handleExportProspects = async () => {
    try {
      setIsExporting(true)
      if (filteredCount <= prospects.length) {
        setExportProgress({ current: 1, total: 1 })
        exportToExcel(prospects, "prospects-export", "Prospects")
        return
      }

      setConnectionStatus("Preparing full export...")
      const totalPages = Math.ceil(filteredCount / exportPageSize)
      const allProspects: Prospect[] = []
      setExportProgress({ current: 0, total: totalPages })

      for (let page = 1; page <= totalPages; page += 1) {
        setExportProgress({ current: page, total: totalPages })
        const pageResults = await getProspects({
          page,
          pageSize: exportPageSize,
          filters,
        })
        if (!Array.isArray(pageResults)) {
          break
        }
        allProspects.push(...(pageResults as Prospect[]))
      }

      exportToExcel(allProspects, "prospects-export", "Prospects")
    } catch (err) {
      console.error("Error exporting prospects:", err)
      setError("Failed to export prospects")
    } finally {
      setConnectionStatus("")
      setIsExporting(false)
      setExportProgress(null)
    }
  }

  const handleResetFilters = () => {
    const emptyFilters = {
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
      prospectTitleKeywords: [],
      includeBlankAccountNames: false,
      includeBlankRnxtDataTypes: false,
      includeBlankProjectNames: false,
      includeBlankDupeStatuses: false,
      includeBlankSfTalStatuses: false,
      includeBlankSfIndustries: false,
      includeBlankContactsTypes: false,
      includeBlankDepartments: false,
      includeBlankLevels: false,
      includeBlankOptizmoSuppressions: false,
      includeBlankCities: false,
      includeBlankCountries: false,
    }
    setPendingFilters(emptyFilters)
    setFilters(emptyFilters)
  }

  const dataLoaded = !pageLoading || hasLoadedOnce

  if (!authReady || !userId) {
    return null
  }

  if ((pageLoading || filterLoading) && !hasLoadedOnce) {
    return <LoadingState connectionStatus={connectionStatus} dbStatus={dbStatus} />
  }

  if (error) {
    return <ErrorState error={error} dbStatus={dbStatus} onRetry={handleRetry} onClearCache={handleClearCache} />
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <Header onRefresh={handleRetry} />

      {dataLoaded && (
        <div className="flex flex-1 overflow-hidden">
          <FiltersSidebar
            filters={filters}
            pendingFilters={pendingFilters}
            availableOptions={availableOptions}
            blankCounts={blankCounts}
            setPendingFilters={setPendingFilters}
            resetFilters={handleResetFilters}
            handleExportProspects={handleExportProspects}
            exportState={{ isExporting, progress: exportProgress }}
            getTotalActiveFilters={getTotalActiveFilters}
            handleLoadSavedFilters={handleLoadSavedFilters}
          />

          <div className="flex-1 bg-background overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 pb-[3px]">
                <SummaryCards
                  filteredProspectsCount={filteredCount}
                  totalProspectsCount={totalCount}
                />

                <ProspectsTab
                  prospects={prospects}
                  currentPage={currentPage}
                  setCurrentPage={setCurrentPage}
                  itemsPerPage={itemsPerPage}
                  filteredCount={filteredCount}
                  isPageLoading={pageLoading}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DashboardContent
