import { WindowFrame } from "@/components/window-frame"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <WindowFrame>{children}</WindowFrame>
}
