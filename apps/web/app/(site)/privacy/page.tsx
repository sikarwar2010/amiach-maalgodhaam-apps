import type { Metadata } from "next"

export const metadata: Metadata = { title: "Privacy Policy" }

export default function PrivacyPage() {
  return (
    <>
      <main className="pt-28 sm:pt-32">
        <div className="container-page max-w-3xl pb-24">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">Privacy Policy</h1>
          <p className="mt-2 text-sm text-ink-400">Last updated September 2026</p>
          <div className="prose-sm mt-8 flex flex-col gap-6 text-sm leading-relaxed text-ink-600">
            <p>
              This Privacy Policy describes how MaalGodaam.com collects, uses and protects information submitted by
              buyers and suppliers on the platform. This is placeholder content for design purposes and should be
              replaced with counsel-reviewed policy before launch.
            </p>
            <p>
              We collect business contact details, transaction history and usage data to operate the marketplace, verify
              suppliers, and improve material discovery. We do not sell personal information to third parties.
            </p>
            <p>
              You may request access to, correction of, or deletion of your account data at any time by contacting our
              support team.
            </p>
          </div>
        </div>
      </main>
    </>
  )
}
