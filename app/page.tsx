"use client"

import React, { useCallback, useEffect, useLayoutEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import { FiltersSidebar } from "@/components/filters/filters-sidebar"
import { SummaryCards } from "@/components/dashboard/summary-cards"
import { ProspectsTab } from "@/components/tabs/prospects-tab"
import { LoadingState } from "@/components/states/loading-state"
import { ErrorState } from "@/components/states/error-state"
import { getAllData, testConnection, getDatabaseStatus, clearCache } from "./actions"
import { exportToExcel } from "@/lib/utils/export-helpers"
import type { Prospect, Filters, AvailableOptions } from "@/lib/types"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

function DashboardContent() {
  const router = useRouter()
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<string>("")
  const [dbStatus, setDbStatus] = useState<any>(null)
  const [availableOptions, setAvailableOptions] = useState<AvailableOptions>({
    prospectDepartments: [],
    prospectLevels: [],
    prospectCities: [],
  })
  const [filteredCount, setFilteredCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [filters, setFilters] = useState<Filters>({
    prospectDepartments: [],
    prospectLevels: [],
    prospectCities: [],
    prospectTitleKeywords: [],
    includeBlankDepartments: false,
    includeBlankLevels: false,
    includeBlankCities: false,
  })
  const [pendingFilters, setPendingFilters] = useState<Filters>({
    prospectDepartments: [],
    prospectLevels: [],
    prospectCities: [],
    prospectTitleKeywords: [],
    includeBlankDepartments: false,
    includeBlankLevels: false,
    includeBlankCities: false,
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(50)
  const [isApplying, setIsApplying] = useState(false)
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
      const data = await getAllData({
        page: currentPage,
        pageSize: itemsPerPage,
        filters,
      })
      console.timeEnd("dashboard getAllData")

      if (data.error) {
        setError(`Database error: ${data.error}`)
        setConnectionStatus("Data loading failed")
        return
      }

      const prospectsData = Array.isArray(data.prospects) ? data.prospects : []
      setProspects(prospectsData as Prospect[])
      setAvailableOptions(data.availableOptions || { prospectDepartments: [], prospectLevels: [], prospectCities: [] })
      setFilteredCount(data.filteredCount ?? 0)
      setTotalCount(data.totalCount ?? 0)
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
  }, [checkDatabaseStatus, testDatabaseConnection, currentPage, itemsPerPage, filters])

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


  const getTotalActiveFilters = () => {
    return (
      pendingFilters.prospectDepartments.length +
      pendingFilters.prospectLevels.length +
      pendingFilters.prospectCities.length +
      pendingFilters.prospectTitleKeywords.length +
      (pendingFilters.includeBlankDepartments ? 1 : 0) +
      (pendingFilters.includeBlankLevels ? 1 : 0) +
      (pendingFilters.includeBlankCities ? 1 : 0)
    )
  }

  const handleLoadSavedFilters = (savedFilters: Filters) => {
    setPendingFilters(savedFilters)
    setFilters(savedFilters)
  }

  const handleExportProspects = () => {
    exportToExcel(prospects, "prospects-export", "Prospects")
  }

  const handleResetFilters = () => {
    const emptyFilters = {
      prospectDepartments: [],
      prospectLevels: [],
      prospectCities: [],
      prospectTitleKeywords: [],
      includeBlankDepartments: false,
      includeBlankLevels: false,
      includeBlankCities: false,
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
                  filteredProspectsCount={filteredCount}
                  totalProspectsCount={totalCount}
                />

                <ProspectsTab
                  prospects={prospects}
                  currentPage={currentPage}
                  setCurrentPage={setCurrentPage}
                  itemsPerPage={itemsPerPage}
                  filteredCount={filteredCount}
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
