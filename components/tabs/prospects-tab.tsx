"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowDownAZ, ArrowUpAZ, ArrowUpDown, PieChartIcon } from "lucide-react"
import { ProspectRow } from "@/components/tables/prospect-row"
import { EmptyState } from "@/components/states/empty-state"
import { ProspectDetailsDialog } from "@/components/dialogs/prospect-details-dialog"
import { getTotalPages, getPageInfo } from "@/lib/utils/helpers"
import type { Prospect } from "@/lib/types"

interface ProspectsTabProps {
  prospects: Prospect[]
  filteredCount: number
  currentPage: number
  setCurrentPage: (page: number | ((prev: number) => number)) => void
  itemsPerPage: number
  isPageLoading: boolean
}

export function ProspectsTab({
  prospects,
  filteredCount,
  currentPage,
  setCurrentPage,
  itemsPerPage,
  isPageLoading,
}: ProspectsTabProps) {
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [sort, setSort] = useState<{
    key: "name" | "location" | "title" | "department"
    direction: "asc" | "desc" | null
  }>({
    key: "name",
    direction: null,
  })
  const handleProspectClick = (prospect: Prospect) => {
    setSelectedProspect(prospect)
    setIsDialogOpen(true)
  }

  const handleSort = (key: typeof sort.key) => {
    setSort((prev) => {
      if (prev.key !== key || prev.direction === null) {
        return { key, direction: "asc" }
      }
      if (prev.direction === "asc") return { key, direction: "desc" }
      return { key, direction: null }
    })
    setCurrentPage(1)
  }


  const sortedProspects = React.useMemo(() => {
    if (!sort.direction) return prospects

    const compare = (a: string | undefined | null, b: string | undefined | null) =>
      (a || "").localeCompare(b || "", undefined, { sensitivity: "base" })

    const getValue = (prospect: Prospect) => {
      switch (sort.key) {
        case "name":
          return (
            [prospect.first_name, prospect.last_name].filter(Boolean).join(" ")
          )
        case "location":
          return [prospect.city, prospect.country].filter(Boolean).join(", ")
        case "title":
          return prospect.designation
        default:
          return prospect.department
      }
    }

    const sorted = [...prospects].sort((a, b) => compare(getValue(a), getValue(b)))
    return sort.direction === "asc" ? sorted : sorted.reverse()
  }, [prospects, sort])

  const SortButton = ({
    label,
    sortKey,
  }: {
    label: string
    sortKey: typeof sort.key
  }) => (
    <button
      type="button"
      onClick={() => handleSort(sortKey)}
      className="inline-flex items-center gap-1 font-medium text-foreground"
    >
      <span>{label}</span>
      {sort.key !== sortKey || sort.direction === null ? (
        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
      ) : sort.direction === "asc" ? (
        <ArrowUpAZ className="h-3.5 w-3.5 text-muted-foreground" />
      ) : (
        <ArrowDownAZ className="h-3.5 w-3.5 text-muted-foreground" />
      )}
    </button>
  )

  // Show empty state when no prospects
  if (prospects.length === 0 && filteredCount === 0) {
    return <EmptyState type="no-results" />
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <PieChartIcon className="h-5 w-5 text-[hsl(var(--chart-1))]" />
        <h2 className="text-lg font-semibold text-foreground">Prospect Analytics</h2>
        <Badge variant="secondary" className="ml-2">
          {filteredCount.toLocaleString()} Prospects
        </Badge>
      </div>

       {/* Data Table */}
        <Card className="flex flex-col h-[calc(100vh-18rem)] border shadow-sm relative">
           <CardHeader className="shrink-0 px-6 py-4">
             <div className="flex flex-wrap items-center gap-3">
               <CardTitle className="text-lg">Prospects Data</CardTitle>
             </div>
           </CardHeader>
            <CardContent className="p-0 flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16"></TableHead>
                      <TableHead>
                        <SortButton label="Name" sortKey="name" />
                      </TableHead>
                      <TableHead>
                        <SortButton label="Location" sortKey="location" />
                      </TableHead>
                      <TableHead>
                        <SortButton label="Job Title" sortKey="title" />
                      </TableHead>
                      <TableHead>
                        <SortButton label="Department" sortKey="department" />
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isPageLoading
                      ? Array.from({ length: Math.min(itemsPerPage, 10) }).map((_, index) => (
                          <TableRow key={`skeleton-${index}`}>
                            <TableCell>
                              <div className="h-8 w-8 rounded-full bg-muted" />
                            </TableCell>
                            <TableCell>
                              <div className="h-4 w-40 bg-muted rounded" />
                            </TableCell>
                            <TableCell>
                              <div className="h-4 w-32 bg-muted rounded" />
                            </TableCell>
                            <TableCell>
                              <div className="h-4 w-36 bg-muted rounded" />
                            </TableCell>
                            <TableCell>
                              <div className="h-4 w-28 bg-muted rounded" />
                            </TableCell>
                          </TableRow>
                        ))
                      : sortedProspects.map((prospect, index) => (
                          <ProspectRow
                            key={`${prospect.email}-${index}`}
                            prospect={prospect}
                            onClick={() => handleProspectClick(prospect)}
                          />
                        ))}
                  </TableBody>
                </Table>
              </div>
                  {prospects.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-6 py-4 border-t shrink-0 bg-muted/20">
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-sm text-muted-foreground">
                          {getPageInfo(currentPage, filteredCount, itemsPerPage).startItem}-{getPageInfo(currentPage, filteredCount, itemsPerPage).endItem} of{" "}
                          {filteredCount}
                        </p>
                  </div>
                  {getTotalPages(filteredCount, itemsPerPage) > 1 && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="h-8"
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground min-w-[60px] text-center">
                        {currentPage}/{getTotalPages(filteredCount, itemsPerPage)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(prev + 1, getTotalPages(filteredCount, itemsPerPage))
                          )
                        }
                        disabled={
                          currentPage === getTotalPages(filteredCount, itemsPerPage)
                        }
                        className="h-8"
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
         </Card>

      {/* Prospect Details Dialog */}
      <ProspectDetailsDialog
        prospect={selectedProspect}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </div>
  )
}
