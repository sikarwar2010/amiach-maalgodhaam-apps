import type { Metadata } from "next"

import { ProfileView } from "@/components/buyer/ProfileView"
import { PageHeader } from "@/components/portal/PortalShell"

export const metadata: Metadata = { title: "Profile" }

export default function ProfilePage() {
  return (
    <>
      <PageHeader title="Profile" subtitle="Your details and business information." />
      <ProfileView />
    </>
  )
}
