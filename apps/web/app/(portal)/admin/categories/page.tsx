import type { Metadata } from "next"

import { CategoryManager } from "@/components/admin/CategoryManager"
import { PageHeader } from "@/components/portal/PortalShell"

export const metadata: Metadata = { title: "Categories" }

export default function AdminCategoriesPage() {
  return (
    <>
      <PageHeader title="Categories" subtitle="The catalogue structure buyers browse." />
      <CategoryManager />
    </>
  )
}
