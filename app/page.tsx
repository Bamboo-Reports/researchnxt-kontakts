"use client"

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import { FiltersSidebar } from "@/components/filters/filters-sidebar"
import { SummaryCards } from "@/components/dashboard/summary-cards"
import { ProspectsTab } from "@/components/tabs/prospects-tab"
import { LoadingState } from "@/components/states/loading-state"
import { ErrorState } from "@/components/states/error-state"
import { getAllData, testConnection, getDatabaseStatus, clearCache } from "./actions"
import { calculateChartData } from "@/lib/utils/chart-helpers"
import { exportToExcel } from "@/lib/utils/export-helpers"
import { createValueMatcher, createKeywordMatcher } from "@/lib/utils/filter-helpers"
import type { Prospect, Filters, AvailableOptions, FilterOption } from "@/lib/types"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

function DashboardContent() {
  const router = useRouter()
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<string>("")
  const [dbStatus, setDbStatus] = useState<any>(null)
  const [filters, setFilters] = useState<Filters>({
    prospectDepartments: [],
    prospectLevels: [],
    prospectCities: [],
    prospectTitleKeywords: [],
  })
  const [pendingFilters, setPendingFilters] = useState<Filters>({
    prospectDepartments: [],
    prospectLevels: [],
    prospectCities: [],
    prospectTitleKeywords: [],
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(50)
  const [isApplying, setIsApplying] = useState(false)
  const [prospectsView, setProspectsView] = useState<"chart" | "data">("chart")
  const [authReady, setAuthReady] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

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

  const loadData = useCallback(async () => {
    console.time("dashboard loadData total")
    try {
      setLoading(true)
      setError(null)
      setConnectionStatus("Checking database configuration...")

      console.time("dashboard checkDatabaseStatus")
      const status = await checkDatabaseStatus()
      console.timeEnd("dashboard checkDatabaseStatus")
      if (status && !status.hasUrl) {
        setError("Database URL not configured. Please check environment variables.")
        setConnectionStatus("Database URL missing")
        return
      }

      if (status && !status.hasConnection) {
        setError("Database connection could not be initialized.")
        setConnectionStatus("Connection initialization failed")
        return
      }

      setConnectionStatus("Testing database connection...")
      console.time("dashboard testDatabaseConnection")
      const connectionOk = await testDatabaseConnection()
      console.timeEnd("dashboard testDatabaseConnection")
      if (!connectionOk) {
        setError("Database connection test failed. Please check your database configuration.")
        return
      }

      setConnectionStatus("Loading prospects from database...")
      console.time("dashboard getAllData")
      const data = await getAllData()
      console.timeEnd("dashboard getAllData")

      if (data.error) {
        setError(`Database error: ${data.error}`)
        setConnectionStatus("Data loading failed")
        return
      }

      const prospectsData = Array.isArray(data.prospects) ? data.prospects : []
      setProspects(prospectsData as Prospect[])
      setConnectionStatus(`Successfully loaded: ${prospectsData.length} prospects`)
    } catch (err) {
      console.error("Error loading data:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to load data from database"
      setError(errorMessage)
      setConnectionStatus("Database connection failed")
    } finally {
      setLoading(false)
      console.timeEnd("dashboard loadData total")
    }
  }, [checkDatabaseStatus, testDatabaseConnection])

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
    loadData()
  }, [authReady, userId, loadData])

  useLayoutEffect(() => {
    setIsApplying(true)
    setFilters(pendingFilters)
    setIsApplying(false)
  }, [pendingFilters])

  const handleClearCache = async () => {
    try {
      setConnectionStatus("Clearing cache...")
      await clearCache()
      await loadData()
    } catch (err) {
      console.error("Error clearing cache:", err)
      setError("Failed to clear cache")
    }
  }

  useEffect(() => {
    setCurrentPage(1)
  }, [filters])

  const filteredProspects = useMemo(() => {
    const matchDepartment = createValueMatcher(filters.prospectDepartments)
    const matchLevel = createValueMatcher(filters.prospectLevels)
    const matchCity = createValueMatcher(filters.prospectCities)
    const matchTitle = createKeywordMatcher(filters.prospectTitleKeywords)

    return prospects.filter((prospect) =>
      matchDepartment(prospect.prospect_department) &&
      matchLevel(prospect.prospect_level) &&
      matchCity(prospect.prospect_city) &&
      matchTitle(prospect.prospect_title)
    )
  }, [prospects, filters])

  const mapToSortedArray = useCallback((map: Map<string, number>): FilterOption[] => {
    return Array.from(map.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count)
  }, [])

  const availableOptions = useMemo((): AvailableOptions => {
    const departmentCounts = new Map<string, number>()
    const levelCounts = new Map<string, number>()
    const cityCounts = new Map<string, number>()

    filteredProspects.forEach((prospect) => {
      if (prospect.prospect_department) {
        departmentCounts.set(
          prospect.prospect_department,
          (departmentCounts.get(prospect.prospect_department) || 0) + 1
        )
      }
      if (prospect.prospect_level) {
        levelCounts.set(
          prospect.prospect_level,
          (levelCounts.get(prospect.prospect_level) || 0) + 1
        )
      }
      if (prospect.prospect_city) {
        cityCounts.set(
          prospect.prospect_city,
          (cityCounts.get(prospect.prospect_city) || 0) + 1
        )
      }
    })

    return {
      prospectDepartments: mapToSortedArray(departmentCounts),
      prospectLevels: mapToSortedArray(levelCounts),
      prospectCities: mapToSortedArray(cityCounts),
    }
  }, [filteredProspects, mapToSortedArray])

  const prospectChartData = useMemo(() => {
    return {
      departmentData: calculateChartData(filteredProspects, "prospect_department"),
      levelData: calculateChartData(filteredProspects, "prospect_level"),
    }
  }, [filteredProspects])

  const getTotalActiveFilters = () => {
    return (
      pendingFilters.prospectDepartments.length +
      pendingFilters.prospectLevels.length +
      pendingFilters.prospectCities.length +
      pendingFilters.prospectTitleKeywords.length
    )
  }

  const handleLoadSavedFilters = (savedFilters: Filters) => {
    setPendingFilters(savedFilters)
    setFilters(savedFilters)
  }

  const handleExportProspects = () => {
    exportToExcel(filteredProspects, "prospects-export", "Prospects")
  }

  const handleResetFilters = () => {
    const emptyFilters = {
      prospectDepartments: [],
      prospectLevels: [],
      prospectCities: [],
      prospectTitleKeywords: [],
    }
    setPendingFilters(emptyFilters)
    setFilters(emptyFilters)
  }

  const dataLoaded = !loading

  if (!authReady || !userId) {
    return null
  }

  if (loading) {
    return <LoadingState connectionStatus={connectionStatus} dbStatus={dbStatus} />
  }

  if (error) {
    return <ErrorState error={error} dbStatus={dbStatus} onRetry={loadData} onClearCache={handleClearCache} />
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <Header onRefresh={loadData} />

      {dataLoaded && (
        <div className="flex flex-1 overflow-hidden">
          <FiltersSidebar
            filters={filters}
            pendingFilters={pendingFilters}
            availableOptions={availableOptions}
            isApplying={isApplying}
            setPendingFilters={setPendingFilters}
            resetFilters={handleResetFilters}
            handleExportProspects={handleExportProspects}
            getTotalActiveFilters={getTotalActiveFilters}
            handleLoadSavedFilters={handleLoadSavedFilters}
          />

          <div className="flex-1 bg-background overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 pb-[3px]">
                <SummaryCards
                  filteredProspectsCount={filteredProspects.length}
                  totalProspectsCount={prospects.length}
                />

                <ProspectsTab
                  prospects={filteredProspects}
                  prospectChartData={prospectChartData}
                  prospectsView={prospectsView}
                  setProspectsView={setProspectsView}
                  currentPage={currentPage}
                  setCurrentPage={setCurrentPage}
                  itemsPerPage={itemsPerPage}
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
