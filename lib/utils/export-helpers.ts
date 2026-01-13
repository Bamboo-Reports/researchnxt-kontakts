import * as XLSX from "xlsx"

/**
 * Export data to Excel file
 */
export const exportToExcel = (data: any[], filename: string, sheetName: string) => {
  try {
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(data)
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
    XLSX.writeFile(wb, `${filename}.xlsx`)
  } catch (error) {
    console.error("Error exporting to Excel:", error)
  }
}

