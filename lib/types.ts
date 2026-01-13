export interface Prospect {
  prospect_full_name?: string | null
  prospect_first_name: string | null
  prospect_last_name: string | null
  prospect_title: string | null
  prospect_department: string | null
  prospect_level: string | null
  prospect_linkedin_url: string | null
  prospect_email: string | null
  prospect_city: string | null
  prospect_state: string | null
  prospect_country: string | null
}

export interface Profile {
  id: string
  user_id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
}

export interface FilterValue {
  value: string
  mode: 'include' | 'exclude'
}

export interface Filters {
  prospectDepartments: FilterValue[]
  prospectLevels: FilterValue[]
  prospectCities: FilterValue[]
  prospectTitleKeywords: FilterValue[]
}

export interface FilterOption {
  value: string
  count: number
  disabled?: boolean
}

export interface AvailableOptions {
  prospectDepartments: FilterOption[]
  prospectLevels: FilterOption[]
  prospectCities: FilterOption[]
}

export interface ChartData {
  name: string
  value: number
}
