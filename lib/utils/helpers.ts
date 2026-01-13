/**
 * Debounce function for search and other delayed actions
 */
export function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

/**
 * Get paginated data
 */
export const getPaginatedData = (data: any[], page: number, itemsPerPage: number) => {
  const startIndex = (page - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  return data.slice(startIndex, endIndex)
}

/**
 * Get total pages for pagination
 */
export const getTotalPages = (totalItems: number, itemsPerPage: number) => {
  return Math.ceil(totalItems / itemsPerPage)
}

/**
 * Get page info for pagination display
 */
export const getPageInfo = (currentPage: number, totalItems: number, itemsPerPage: number) => {
  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)
  return { startItem, endItem, totalItems }
}

/**
 * Copy text to clipboard
 */
export const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text)
}
