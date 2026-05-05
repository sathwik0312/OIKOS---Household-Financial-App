import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0A0A0F" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold" style={{ color: "#F1F1F3" }}>
            <span style={{ color: "#6C63FF" }}>OIKOS</span>
          </h1>
          <p className="mt-2" style={{ color: "#6B7280" }}>
            The financial nervous system of your household
          </p>
        </div>
        <div className="flex justify-center">
          <SignIn
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "bg-[#13131A] border border-[#2A2A38] shadow-2xl",
                headerTitle: "text-[#F1F1F3]",
                headerSubtitle: "text-[#6B7280]",
                socialButtonsBlockButton:
                  "border-[#2A2A38] text-[#F1F1F3] hover:bg-[#1C1C26]",
                dividerLine: "bg-[#2A2A38]",
                dividerText: "text-[#6B7280]",
                formFieldLabel: "text-[#9CA3AF]",
                formFieldInput:
                  "bg-[#1C1C26] border-[#2A2A38] text-[#F1F1F3] focus:border-[#6C63FF]",
                formButtonPrimary: "bg-[#6C63FF] hover:bg-[#7D75FF] text-white",
                footerActionLink: "text-[#6C63FF] hover:text-[#7D75FF]",
                identityPreviewText: "text-[#F1F1F3]",
                identityPreviewEditButton: "text-[#6C63FF]",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
