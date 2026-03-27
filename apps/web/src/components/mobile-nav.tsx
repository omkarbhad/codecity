"use client"

import React from "react"
import Link from "next/link"
import { cn } from "@codecity/ui/lib/utils"
import { Portal, PortalBackdrop } from "@codecity/ui/components/portal"
import { Button } from "@codecity/ui/components/button"
import { navLinks } from "@/components/header"
import { XIcon, MenuIcon, LogIn } from "lucide-react"

export function HeaderMobileNav({
  user,
}: {
  user: { name: string | null } | null
}) {
  const [open, setOpen] = React.useState(false)

  return (
    <div className="md:hidden">
      <Button
        aria-controls="mobile-menu"
        aria-expanded={open}
        aria-label="Toggle menu"
        className="md:hidden"
        onClick={() => setOpen(!open)}
        size="icon"
        variant="outline"
      >
        {open ? <XIcon className="size-4.5" /> : <MenuIcon className="size-4.5" />}
      </Button>
      {open && (
        <Portal className="top-14" id="mobile-menu">
          <PortalBackdrop />
          <div
            className={cn(
              "data-[slot=open]:zoom-in-97 ease-out data-[slot=open]:animate-in",
              "size-full p-4",
            )}
            data-slot={open ? "open" : "closed"}
          >
            {user && (
              <div className="px-3 py-2 mb-2 border-b border-border pb-4">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Signed in as
                </p>
                <p className="text-[13px] font-medium text-foreground mt-1">
                  {user.name ?? "User"}
                </p>
              </div>
            )}
            <div className="grid gap-y-2">
              {navLinks.map((link) => (
                <Button
                  asChild
                  className="justify-start"
                  key={link.label}
                  variant="ghost"
                  onClick={() => setOpen(false)}
                >
                  <Link href={link.href}>{link.label}</Link>
                </Button>
              ))}
            </div>
            {!user && (
              <div className="mt-12 flex flex-col gap-2">
                <Button asChild className="w-full" variant="outline" onClick={() => setOpen(false)}>
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button asChild className="w-full" onClick={() => setOpen(false)}>
                  <Link href="/login">Get Started</Link>
                </Button>
              </div>
            )}
          </div>
        </Portal>
      )}
    </div>
  )
}
