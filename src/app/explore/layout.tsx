import { WindowFrame } from "@/components/window-frame"

export default function ReposRedirectLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <WindowFrame>{children}</WindowFrame>
}
