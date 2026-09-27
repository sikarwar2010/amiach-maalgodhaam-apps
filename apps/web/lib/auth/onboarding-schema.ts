import type { AccountKind, OnboardRole } from "./types"

export type FieldKind =
  "text" | "email" | "tel" | "number" | "select" | "multiselect" | "textarea" | "file" | "checkbox"

export interface Field {
  name: string
  label: string
  kind: FieldKind
  required?: boolean
  placeholder?: string
  hint?: string
  options?: { value: string; label: string }[]
  /** "categories" resolves to the live category list (built-in + admin-created). */
  optionsFrom?: "categories"
  validate?: "gstin" | "pan" | "phone" | "pincode" | "email"
  span?: 1 | 2
  accept?: string
}

export interface Step {
  id: string
  title: string
  description: string
  fields: Field[]
}

const opt = (...labels: string[]) =>
  labels.map((l) => ({
    value: l.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    label: l,
  }))

export const PATTERNS = {
  gstin: /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/,
  pan: /^[A-Z]{5}\d{4}[A-Z]$/,
  phone: /^[6-9]\d{9}$/,
  pincode: /^\d{6}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
} as const

export const VALIDATION_MESSAGE: Record<NonNullable<Field["validate"]>, string> = {
  gstin: "Enter a valid 15-character GSTIN (e.g. 06ABCDE1234F1Z5).",
  pan: "Enter a valid 10-character PAN (e.g. ABCDE1234F).",
  phone: "Enter a valid 10-digit Indian mobile number.",
  pincode: "Enter a valid 6-digit PIN code.",
  email: "Enter a valid email address.",
}

const contactFields = (withDesignation: boolean): Field[] => [
  {
    name: "contactName",
    label: "Contact person",
    kind: "text",
    required: true,
    placeholder: "Full name",
  },
  ...(withDesignation
    ? [
        {
          name: "designation",
          label: "Designation",
          kind: "text" as const,
          placeholder: "e.g. Procurement Head",
        },
      ]
    : []),
  {
    name: "phone",
    label: "Mobile number",
    kind: "tel",
    required: true,
    validate: "phone",
    placeholder: "98765 43210",
    hint: "We send order and enquiry alerts here.",
  },
  {
    name: "email",
    label: "Business email",
    kind: "email",
    required: true,
    validate: "email",
    placeholder: "you@company.com",
  },
]

const addressFields: Field[] = [
  {
    name: "address",
    label: "Address",
    kind: "text",
    required: true,
    span: 2,
    placeholder: "Plot / building, street, area",
  },
  {
    name: "city",
    label: "City",
    kind: "text",
    required: true,
    placeholder: "Gurugram",
  },
  {
    name: "state",
    label: "State",
    kind: "text",
    required: true,
    placeholder: "Haryana",
  },
  {
    name: "pincode",
    label: "PIN code",
    kind: "text",
    required: true,
    validate: "pincode",
    placeholder: "122001",
  },
]

const termsField = (text: string): Field => ({
  name: "terms",
  label: text,
  kind: "checkbox",
  required: true,
  span: 2,
})

export const STEPS: Record<string, Step[]> = {
  "vendor:b2b": [
    {
      id: "business",
      title: "Business details",
      description: "Tell us who is selling. GST-registered vendors get a verified badge after review.",
      fields: [
        {
          name: "legalName",
          label: "Registered business name",
          kind: "text",
          required: true,
          span: 2,
          placeholder: "As on GST certificate",
        },
        {
          name: "tradeName",
          label: "Trade / brand name",
          kind: "text",
          placeholder: "If different",
        },
        {
          name: "businessType",
          label: "Business type",
          kind: "select",
          required: true,
          options: opt(
            "Manufacturer",
            "Distributor",
            "Dealer / Retailer",
            "Contractor",
            "Real-estate developer",
            "Other"
          ),
        },
        {
          name: "gstin",
          label: "GSTIN",
          kind: "text",
          required: true,
          validate: "gstin",
          placeholder: "06ABCDE1234F1Z5",
        },
        {
          name: "pan",
          label: "Business PAN",
          kind: "text",
          required: true,
          validate: "pan",
          placeholder: "ABCDE1234F",
        },
        {
          name: "yearsInBusiness",
          label: "Years in business",
          kind: "number",
          placeholder: "e.g. 8",
        },
      ],
    },
    {
      id: "contact",
      title: "Contact & warehouse",
      description: "Where buyers can collect material and who they will speak to.",
      fields: [...contactFields(true), ...addressFields],
    },
    {
      id: "inventory",
      title: "Inventory profile",
      description: "Helps us route the right buyers and requirements to you.",
      fields: [
        {
          name: "categories",
          label: "Categories you sell",
          kind: "multiselect",
          required: true,
          optionsFrom: "categories",
          span: 2,
        },
        {
          name: "stockValue",
          label: "Typical surplus stock value",
          kind: "select",
          options: opt("Under ₹5 lakh", "₹5–25 lakh", "₹25 lakh – ₹1 crore", "Above ₹1 crore"),
        },
        {
          name: "logistics",
          label: "Logistics you can offer",
          kind: "select",
          options: opt("Self pickup only", "Transport arranged", "Pan-India freight"),
        },
      ],
    },
    {
      id: "verify",
      title: "Verification & terms",
      description: "Documents are reviewed by the MaalGodaam team before your listings go live.",
      fields: [
        {
          name: "gstDoc",
          label: "GST certificate",
          kind: "file",
          required: true,
          accept: ".pdf,.jpg,.jpeg,.png",
          hint: "PDF or image, up to 5 MB.",
        },
        {
          name: "panDoc",
          label: "PAN card",
          kind: "file",
          required: true,
          accept: ".pdf,.jpg,.jpeg,.png",
        },
        termsField(
          "I confirm the details are accurate, I am authorised to sell this inventory, and I accept the Terms & Conditions and Privacy Policy."
        ),
      ],
    },
  ],
  "vendor:b2c": [
    {
      id: "personal",
      title: "About you",
      description: "Selling leftover renovation or project material? Start here.",
      fields: [
        {
          name: "contactName",
          label: "Full name",
          kind: "text",
          required: true,
        },
        {
          name: "phone",
          label: "Mobile number",
          kind: "tel",
          required: true,
          validate: "phone",
          placeholder: "98765 43210",
        },
        {
          name: "email",
          label: "Email",
          kind: "email",
          required: true,
          validate: "email",
        },
        { name: "city", label: "City", kind: "text", required: true },
        { name: "state", label: "State", kind: "text", required: true },
        {
          name: "pincode",
          label: "PIN code",
          kind: "text",
          required: true,
          validate: "pincode",
        },
      ],
    },
    {
      id: "inventory",
      title: "What are you selling?",
      description: "You can list individual items after your account is approved.",
      fields: [
        {
          name: "categories",
          label: "Material types",
          kind: "multiselect",
          required: true,
          optionsFrom: "categories",
          span: 2,
        },
        {
          name: "source",
          label: "Where is it from?",
          kind: "select",
          required: true,
          options: opt("Home renovation leftover", "Cancelled project order", "Shop / showroom closure", "Other"),
        },
        {
          name: "approxValue",
          label: "Approx. value (₹)",
          kind: "number",
          placeholder: "e.g. 50000",
        },
      ],
    },
    {
      id: "verify",
      title: "Identity & terms",
      description: "A quick identity check keeps the marketplace safe for everyone.",
      fields: [
        {
          name: "idDoc",
          label: "Government ID proof",
          kind: "file",
          required: true,
          accept: ".pdf,.jpg,.jpeg,.png",
          hint: "Aadhaar, PAN, Voter ID or Driving Licence.",
        },
        termsField("I confirm the material is mine to sell and accept the Terms & Conditions and Privacy Policy."),
      ],
    },
  ],
  "customer:b2b": [
    {
      id: "business",
      title: "Business details",
      description: "Trade buyers unlock bulk pricing, quotes and GST invoices.",
      fields: [
        {
          name: "legalName",
          label: "Company / firm name",
          kind: "text",
          required: true,
          span: 2,
        },
        {
          name: "businessType",
          label: "You are a…",
          kind: "select",
          required: true,
          options: opt(
            "Architect",
            "Interior designer",
            "Contractor",
            "Builder / Developer",
            "Dealer / Retailer",
            "Procurement team",
            "Other"
          ),
        },
        {
          name: "gstin",
          label: "GSTIN (for GST invoices)",
          kind: "text",
          validate: "gstin",
          placeholder: "Optional now, required for checkout",
          hint: "You can add this later.",
        },
        {
          name: "teamSize",
          label: "Team size",
          kind: "select",
          options: opt("1–10", "11–50", "51–200", "200+"),
        },
      ],
    },
    {
      id: "contact",
      title: "Contact & delivery",
      description: "Where we should send quotes and where material is usually delivered.",
      fields: [...contactFields(true), ...addressFields],
    },
    {
      id: "buying",
      title: "Buying preferences",
      description: "We use this to surface relevant deals and match your requirements.",
      fields: [
        {
          name: "categories",
          label: "Categories you buy",
          kind: "multiselect",
          required: true,
          optionsFrom: "categories",
          span: 2,
        },
        {
          name: "orderValue",
          label: "Typical order value",
          kind: "select",
          options: opt("Under ₹1 lakh", "₹1–10 lakh", "₹10–50 lakh", "Above ₹50 lakh"),
        },
        {
          name: "projectType",
          label: "Main project type",
          kind: "select",
          options: opt("Residential", "Commercial", "Retail fit-out", "Industrial", "Resale / trading"),
        },
        termsField("I accept the Terms & Conditions and Privacy Policy."),
      ],
    },
  ],
  "customer:b2c": [
    {
      id: "personal",
      title: "About you",
      description: "Homeowners get access to surplus deals across India.",
      fields: [
        {
          name: "contactName",
          label: "Full name",
          kind: "text",
          required: true,
        },
        {
          name: "phone",
          label: "Mobile number",
          kind: "tel",
          required: true,
          validate: "phone",
          placeholder: "98765 43210",
        },
        {
          name: "email",
          label: "Email",
          kind: "email",
          required: true,
          validate: "email",
        },
        { name: "city", label: "City", kind: "text", required: true },
        {
          name: "pincode",
          label: "PIN code",
          kind: "text",
          required: true,
          validate: "pincode",
          hint: "Used to show deals near you.",
        },
      ],
    },
    {
      id: "preferences",
      title: "Your project",
      description: "Optional — helps us recommend the right materials.",
      fields: [
        {
          name: "categories",
          label: "Interested in",
          kind: "multiselect",
          optionsFrom: "categories",
          span: 2,
        },
        {
          name: "projectType",
          label: "Project",
          kind: "select",
          options: opt("New home", "Renovation", "Repair / replacement", "Just browsing"),
        },
        {
          name: "budget",
          label: "Budget",
          kind: "select",
          options: opt("Under ₹50,000", "₹50,000 – ₹3 lakh", "₹3–10 lakh", "Above ₹10 lakh"),
        },
        termsField("I accept the Terms & Conditions and Privacy Policy."),
      ],
    },
  ],
}

export function stepsFor(role: OnboardRole, type: AccountKind): Step[] {
  return STEPS[`${role}:${type}`] ?? []
}

export function validateField(field: Field, value: unknown): string | null {
  const empty =
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0) ||
    value === false
  if (empty) return field.required ? "This field is required." : null
  if (field.validate && typeof value === "string") {
    const v =
      field.validate === "gstin" || field.validate === "pan" ? value.trim().toUpperCase() : value.replace(/\s/g, "")
    if (!PATTERNS[field.validate].test(v)) return VALIDATION_MESSAGE[field.validate]
  }
  return null
}

export type OnboardingValues = Record<string, string | string[] | boolean>

/** Server-side re-validation of a full submission. Never trust the client. */
export function validateSubmission(role: OnboardRole, type: AccountKind, values: OnboardingValues): string | null {
  for (const step of stepsFor(role, type)) {
    for (const field of step.fields) {
      const err = validateField(field, values[field.name])
      if (err) return `${field.label}: ${err}`
    }
  }
  return null
}
