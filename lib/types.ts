export interface Prospect {
  rnxt_data_type: string | null
  project_name: string | null
  time_stamp: string | null
  dupe_status: string | null
  rnxt_id: string | null
  sf_tal_status: string | null
  sf_industry: string | null
  br_account_name: string | null
  account_name: string | null
  contacts_type: string | null
  entity_name: string | null
  first_name: string | null
  last_name: string | null
  designation: string | null
  department: string | null
  level: string | null
  email: string | null
  optizmo_supression: string | null
  linkedin_id: string | null
  other_source: string | null
  city: string | null
  state: string | null
  country: string | null
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
  prospectAccountNames: FilterValue[]
  prospectRnxtDataTypes: FilterValue[]
  prospectProjectNames: FilterValue[]
  prospectDupeStatuses: FilterValue[]
  prospectSfTalStatuses: FilterValue[]
  prospectSfIndustries: FilterValue[]
  prospectContactsTypes: FilterValue[]
  prospectDepartments: FilterValue[]
  prospectLevels: FilterValue[]
  prospectOptizmoSuppressions: FilterValue[]
  prospectCities: FilterValue[]
  prospectCountries: FilterValue[]
  prospectTitleKeywords: FilterValue[]
  includeBlankAccountNames: boolean
  includeBlankRnxtDataTypes: boolean
  includeBlankProjectNames: boolean
  includeBlankDupeStatuses: boolean
  includeBlankSfTalStatuses: boolean
  includeBlankSfIndustries: boolean
  includeBlankContactsTypes: boolean
  includeBlankDepartments: boolean
  includeBlankLevels: boolean
  includeBlankOptizmoSuppressions: boolean
  includeBlankCities: boolean
  includeBlankCountries: boolean
}

export interface FilterOption {
  value: string
  count: number
  disabled?: boolean
}

export interface AvailableOptions {
  prospectAccountNames: FilterOption[]
  prospectRnxtDataTypes: FilterOption[]
  prospectProjectNames: FilterOption[]
  prospectDupeStatuses: FilterOption[]
  prospectSfTalStatuses: FilterOption[]
  prospectSfIndustries: FilterOption[]
  prospectContactsTypes: FilterOption[]
  prospectDepartments: FilterOption[]
  prospectLevels: FilterOption[]
  prospectOptizmoSuppressions: FilterOption[]
  prospectCities: FilterOption[]
  prospectCountries: FilterOption[]
}

export interface ChartData {
  name: string
  value: number
}
