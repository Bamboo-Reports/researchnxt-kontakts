"use client"

import React, { useState } from "react"
import { cn } from "@/lib/utils"
import { Filter, Users, X, Plus, Minus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { EnhancedMultiSelect } from "@/components/enhanced-multi-select"
import { SavedFiltersManager } from "@/components/saved-filters-manager"
import type { Filters, AvailableOptions, BlankCounts, FilterValue } from "@/lib/types"

interface FiltersSidebarProps {
  filters: Filters
  pendingFilters: Filters
  availableOptions: AvailableOptions
  blankCounts: BlankCounts
  setPendingFilters: React.Dispatch<React.SetStateAction<Filters>>
  resetFilters: () => void
  handleExportProspects: () => void
  getTotalActiveFilters: () => number
  handleLoadSavedFilters: (savedFilters: Filters) => void
}

export function FiltersSidebar({
  filters,
  pendingFilters,
  availableOptions,
  blankCounts,
  setPendingFilters,
  resetFilters,
  handleExportProspects,
  getTotalActiveFilters,
  handleLoadSavedFilters,
}: FiltersSidebarProps) {
  const valueFilters = [
    {
      key: "prospectAccountNames",
      includeBlankKey: "includeBlankAccountNames",
      optionsKey: "prospectAccountNames",
      label: "Account Name",
      placeholder: "Select account names...",
    },
    {
      key: "prospectRnxtDataTypes",
      includeBlankKey: "includeBlankRnxtDataTypes",
      optionsKey: "prospectRnxtDataTypes",
      label: "RNXT Data Type",
      placeholder: "Select data types...",
    },
    {
      key: "prospectProjectNames",
      includeBlankKey: "includeBlankProjectNames",
      optionsKey: "prospectProjectNames",
      label: "Project Name",
      placeholder: "Select project names...",
    },
    {
      key: "prospectDupeStatuses",
      includeBlankKey: "includeBlankDupeStatuses",
      optionsKey: "prospectDupeStatuses",
      label: "Dupe Status",
      placeholder: "Select dupe statuses...",
    },
    {
      key: "prospectSfTalStatuses",
      includeBlankKey: "includeBlankSfTalStatuses",
      optionsKey: "prospectSfTalStatuses",
      label: "SF TAL Status",
      placeholder: "Select SF TAL statuses...",
    },
    {
      key: "prospectSfIndustries",
      includeBlankKey: "includeBlankSfIndustries",
      optionsKey: "prospectSfIndustries",
      label: "SF Industry",
      placeholder: "Select SF industries...",
    },
    {
      key: "prospectContactsTypes",
      includeBlankKey: "includeBlankContactsTypes",
      optionsKey: "prospectContactsTypes",
      label: "Contacts Type",
      placeholder: "Select contact types...",
    },
    {
      key: "prospectDepartments",
      includeBlankKey: "includeBlankDepartments",
      optionsKey: "prospectDepartments",
      label: "Department",
      placeholder: "Select departments...",
    },
    {
      key: "prospectLevels",
      includeBlankKey: "includeBlankLevels",
      optionsKey: "prospectLevels",
      label: "Level",
      placeholder: "Select levels...",
    },
    {
      key: "prospectOptizmoSuppressions",
      includeBlankKey: "includeBlankOptizmoSuppressions",
      optionsKey: "prospectOptizmoSuppressions",
      label: "Optizmo Suppression",
      placeholder: "Select suppression statuses...",
    },
    {
      key: "prospectCities",
      includeBlankKey: "includeBlankCities",
      optionsKey: "prospectCities",
      label: "City",
      placeholder: "Select cities...",
    },
    {
      key: "prospectCountries",
      includeBlankKey: "includeBlankCountries",
      optionsKey: "prospectCountries",
      label: "Country",
      placeholder: "Select countries...",
    },
  ] as const

  return (
    <div className="border-r bg-sidebar overflow-y-auto overflow-x-hidden w-[360px] shrink-0 relative">
      <div className="p-3 space-y-3">
        <div className="flex flex-col gap-2 mb-3 pb-3 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">Prospect Filters</span>
          </div>
          <SavedFiltersManager
            currentFilters={filters}
            onLoadFilters={handleLoadSavedFilters}
            totalActiveFilters={getTotalActiveFilters()}
            onReset={resetFilters}
            onExport={handleExportProspects}
          />
        </div>

        <div className="rounded-lg border border-sidebar-border/60 bg-sidebar/40 p-3">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-[hsl(var(--chart-3))]" />
            <span className="text-sm font-semibold text-foreground">Prospects</span>
          </div>

          <div className="space-y-3">
            {valueFilters.map((filterConfig) => {
              const selected = pendingFilters[filterConfig.key] as FilterValue[]
              const includeBlank = pendingFilters[filterConfig.includeBlankKey] as boolean
              const options = availableOptions[filterConfig.optionsKey] || []
              const blankCount = blankCounts[filterConfig.optionsKey] || 0
              const showIncludeBlanks = includeBlank || blankCount > 0
              return (
                <div className="space-y-2" key={filterConfig.key}>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">{filterConfig.label}</Label>
                    {showIncludeBlanks && (
                      <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <Checkbox
                          checked={includeBlank}
                          onCheckedChange={(checked) =>
                            setPendingFilters((prev) => ({
                              ...prev,
                              [filterConfig.includeBlankKey]: checked === true,
                            }))
                          }
                        />
                        <span>Include blanks</span>
                      </label>
                    )}
                  </div>
                  <EnhancedMultiSelect
                    options={options}
                    selected={selected}
                    onChange={(nextSelected) => {
                      setPendingFilters((prev) => ({ ...prev, [filterConfig.key]: nextSelected }))
                    }}
                    placeholder={filterConfig.placeholder}
                  />
                </div>
              )
            })}
            <div className="space-y-2 pt-3 border-t border-border">
              <Label className="text-xs font-medium">Title Keywords</Label>
              <TitleKeywordInput
                keywords={pendingFilters.prospectTitleKeywords}
                onChange={(keywords) => setPendingFilters((prev) => ({ ...prev, prospectTitleKeywords: keywords }))}
                placeholder="e.g., Manager, Director, VP..."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function TitleKeywordInput({
  keywords,
  onChange,
  placeholder = "e.g., Manager, Director, VP...",
}: {
  keywords: FilterValue[]
  onChange: (keywords: FilterValue[]) => void
  placeholder?: string
}) {
  const [inputValue, setInputValue] = useState("")

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault()
      const trimmedValue = inputValue.trim()
      if (!keywords.find((k) => k.value === trimmedValue)) {
        onChange([...keywords, { value: trimmedValue, mode: "include" }])
      }
      setInputValue("")
    }
  }

  const removeKeyword = (keywordToRemove: FilterValue) => {
    onChange(keywords.filter((k) => k.value !== keywordToRemove.value))
  }

  const toggleKeywordMode = (keyword: FilterValue) => {
    onChange(
      keywords.map((k) =>
        k.value === keyword.value
          ? { ...k, mode: k.mode === "include" ? "exclude" : "include" }
          : k
      )
    )
  }

  return (
    <div className="space-y-2">
      <Input
        type="text"
        placeholder={placeholder}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className="text-sm"
      />
      {keywords.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {keywords.map((keyword) => {
            const isInclude = keyword.mode === "include"
            return (
              <Badge
                key={keyword.value}
                variant="secondary"
                className={cn(
                  "flex items-center gap-1 pr-1",
                  isInclude
                    ? "bg-green-500/20 text-green-700 dark:bg-green-500/30 dark:text-green-300 border-green-500/50 hover:bg-green-500/30"
                    : "bg-red-500/20 text-red-700 dark:bg-red-500/30 dark:text-red-300 border-red-500/50 hover:bg-red-500/30"
                )}
              >
                <button
                  onClick={() => toggleKeywordMode(keyword)}
                  className={cn(
                    "flex items-center justify-center w-4 h-4 rounded-sm",
                    isInclude
                      ? "bg-green-600/30 hover:bg-green-600/50"
                      : "bg-red-600/30 hover:bg-red-600/50"
                  )}
                  title={isInclude ? "Click to exclude" : "Click to include"}
                  type="button"
                >
                  {isInclude ? <Plus className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                </button>
                <span className="text-xs">{keyword.value}</span>
                <button
                  onClick={() => removeKeyword(keyword)}
                  className="ml-1 rounded-sm opacity-70 hover:opacity-100 hover:bg-accent p-0.5"
                  type="button"
                  title="Remove"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )
          })}
        </div>
      )}
    </div>
  )
}
