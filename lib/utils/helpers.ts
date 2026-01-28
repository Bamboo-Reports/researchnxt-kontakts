/**
 * Get total pages for pagination
 */
export const getTotalPages = (totalItems: number, itemsPerPage: number): number => {
  return Math.ceil(totalItems / itemsPerPage)
}

/**
 * Get page info for pagination display
 */
export const getPageInfo = (
  currentPage: number,
  totalItems: number,
  itemsPerPage: number
): { startItem: number; endItem: number; totalItems: number } => {
  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)
  return { startItem, endItem, totalItems }
}

/**
 * Copy text to clipboard
 */
export const copyToClipboard = (text: string): Promise<void> => {
  return navigator.clipboard.writeText(text)
}
