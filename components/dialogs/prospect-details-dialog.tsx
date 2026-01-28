"use client"

import React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Mail,
  Linkedin,
  MapPin,
  Briefcase,
  Users,
  Award,
  Building2,
  FileText,
  BadgeCheck,
  Link,
  Calendar,
  AlertTriangle,
  Database,
  Factory,
  ShieldAlert,
  ArrowUpRight,
  Phone,
} from "lucide-react"
import type { Prospect } from "@/lib/types"

interface ProspectDetailsDialogProps {
  prospect: Prospect | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const InfoRow = ({
  icon: Icon,
  label,
  value,
  link,
  linkIcon,
  displayValue,
}: {
  icon: any
  label: string
  value?: string | null
  link?: string
  linkIcon?: any
  displayValue?: string
}) => {
  if (!value) return null

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-background/40 backdrop-blur-sm border border-border/50 hover:border-border dark:bg-white/5 dark:border-white/10 dark:backdrop-blur-md dark:shadow-[0_8px_30px_rgba(0,0,0,0.35)]">
      <div className="mt-0.5">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
        {link ? (
          linkIcon ? (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className="inline-flex items-center justify-between gap-2 text-sm font-medium text-primary hover:underline break-words"
            >
              <span>{displayValue ?? value}</span>
              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full border border-border/60 text-primary hover:bg-accent shrink-0">
                <linkIcon className="h-4 w-4" />
              </span>
            </a>
          ) : (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-primary hover:underline break-words"
            >
              {value}
            </a>
          )
        ) : (
          <p className="text-sm font-medium break-words">{value}</p>
        )}
      </div>
    </div>
  )
}

export function ProspectDetailsDialog({
  prospect,
  open,
  onOpenChange,
}: ProspectDetailsDialogProps) {
  if (!prospect) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[70vw] max-w-[70vw] max-h-[70vh] overflow-y-auto glassmorphism-dialog">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-lg font-bold text-primary">
                {[prospect.first_name?.[0], prospect.last_name?.[0]].filter(Boolean).join("") || "?"}
              </span>
            </div>
            <div>
              {[prospect.first_name, prospect.last_name].filter(Boolean).join(" ")}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-6">
          {renderSection("Account Information", [
            { icon: Building2, label: "Account Name", value: prospect.account_name },
            { icon: Building2, label: "BR Account Name", value: prospect.br_account_name },
            { icon: Building2, label: "Entity Name", value: prospect.entity_name },
            { icon: BadgeCheck, label: "Contact Type", value: prospect.contacts_type },
          ])}

          {renderSection("Contact Information", [
            {
              icon: Mail,
              label: "Email",
              value: prospect.email,
              link: prospect.email ? `mailto:${prospect.email}` : undefined,
            },
            {
              icon: Phone,
              label: "Boardline",
              value: prospect.boardline,
              link: prospect.boardline ? `tel:${prospect.boardline}` : undefined,
            },
            {
              icon: Phone,
              label: "Mobile Phone",
              value: prospect.mobile_phone,
              link: prospect.mobile_phone ? `tel:${prospect.mobile_phone}` : undefined,
            },
            {
              icon: Phone,
              label: "Mobile Phone (Secondary)",
              value: prospect.mobile_phone_secondary,
              link: prospect.mobile_phone_secondary
                ? `tel:${prospect.mobile_phone_secondary}`
                : undefined,
            },
            {
              icon: Linkedin,
              label: "LinkedIn Profile",
              value: prospect.linkedin_id,
              link: prospect.linkedin_id || undefined,
              linkIcon: ArrowUpRight,
              displayValue: "View profile",
            },
            {
              icon: Link,
              label: "Other Source",
              value: prospect.other_source,
              link: prospect.other_source || undefined,
            },
          ])}

          {renderSection("Professional Information", [
            { icon: Briefcase, label: "Job Title", value: prospect.designation },
            { icon: Users, label: "Department", value: prospect.department },
            { icon: Award, label: "Level", value: prospect.level },
            { icon: FileText, label: "Project Name", value: prospect.project_name },
          ])}

          {renderSection("Data Attributes", [
            { icon: Database, label: "RNXT Data Type", value: prospect.rnxt_data_type },
            { icon: FileText, label: "RNXT ID", value: prospect.rnxt_id },
            { icon: Calendar, label: "Time Stamp", value: prospect.time_stamp },
            { icon: AlertTriangle, label: "Dupe Status", value: prospect.dupe_status },
            { icon: BadgeCheck, label: "SF TAL Status", value: prospect.sf_tal_status },
            { icon: Factory, label: "SF Industry", value: prospect.sf_industry },
            { icon: ShieldAlert, label: "Optizmo Suppression", value: prospect.optizmo_supression },
          ])}

          {renderSection("Location", [
            { icon: MapPin, label: "City", value: prospect.city },
            { icon: MapPin, label: "State", value: prospect.state },
            { icon: MapPin, label: "Country", value: prospect.country },
          ])}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function renderSection(
  title: string,
  rows: Array<{
    icon: any
    label: string
    value?: string | null
    link?: string
    linkIcon?: any
    displayValue?: string
  }>
) {
  const visibleRows = rows.filter((row) => Boolean(row.value))
  if (visibleRows.length === 0) return null

  return (
    <div>
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        {title}
      </h3>
      <div className="grid gap-3">
        {visibleRows.map((row) => (
          <InfoRow
            key={row.label}
            icon={row.icon}
            label={row.label}
            value={row.value}
            link={row.link}
            linkIcon={row.linkIcon}
            displayValue={row.displayValue}
          />
        ))}
      </div>
    </div>
  )
}
