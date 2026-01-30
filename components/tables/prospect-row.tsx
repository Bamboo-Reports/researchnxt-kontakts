import { memo } from "react"
import type { CSSProperties } from "react"
import { cn } from "@/lib/utils"
import { TableRow, TableCell } from "@/components/ui/table"
import type { Prospect } from "@/lib/types"

interface ProspectRowProps {
  prospect: Prospect
  onClick: () => void
  className?: string
  style?: CSSProperties
}

export const ProspectRow = memo(function ProspectRow({
  prospect,
  onClick,
  className,
  style,
}: ProspectRowProps): JSX.Element {
  const fullName = [prospect.first_name, prospect.last_name].filter(Boolean).join(" ")
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")

  return (
    <TableRow
      className={cn("cursor-pointer transition-colors hover:bg-muted/50", className)}
      onClick={onClick}
      style={style}
    >
      <TableCell>
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-sm font-bold text-primary">
            {initials}
          </span>
        </div>
      </TableCell>
      <TableCell className="font-medium">{fullName || "N/A"}</TableCell>
      <TableCell>
        {[prospect.city, prospect.country].filter(Boolean).join(", ") || "N/A"}
      </TableCell>
      <TableCell>{prospect.designation}</TableCell>
      <TableCell>{prospect.department}</TableCell>
    </TableRow>
  )
})
ProspectRow.displayName = "ProspectRow"
