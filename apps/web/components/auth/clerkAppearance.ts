// Clerk's prebuilt <SignIn/> / <SignUp/> styled to the MaalGodaam design system.
export const clerkAppearance = {
  variables: {
    colorPrimary: "#173C8A",
    colorText: "#1A1713",
    fontFamily: "var(--font-manrope), system-ui, sans-serif",
    borderRadius: "0.875rem",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "w-full shadow-none",
    card: "w-full rounded-[1.75rem] border border-[#F2EEE6] bg-white p-2 shadow-[0_2px_8px_-2px_rgb(26_23_19/0.07)]",
    headerTitle: "text-2xl font-extrabold tracking-tight",
    formButtonPrimary: "bg-[#E8722A] hover:bg-[#CC5D1C] text-white font-semibold normal-case rounded-xl h-11",
    footerActionLink: "text-[#173C8A] font-semibold",
    formFieldInput: "rounded-2xl h-12 bg-[#FDFCFA]",
  },
} as const
