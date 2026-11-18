import { WindowFrame } from "@/components/window-frame"

export default function ReposLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <WindowFrame>{children}</WindowFrame>
}
