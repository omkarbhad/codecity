// Facts the page states. Keep them true: each one is checked against the repo or a release.
export const SITE = {
  name: "CodeCity",
  url: "https://codecity.magnova.ai",
  repo: "https://github.com/omkarbhad/codecity",
  releases: "https://github.com/omkarbhad/codecity/releases/latest",
  license: "https://github.com/omkarbhad/codecity/blob/main/LICENSE",
  contributing: "https://github.com/omkarbhad/codecity/blob/main/CONTRIBUTING.md",
  issues: "https://github.com/omkarbhad/codecity/issues",
  version: "0.1.1",
  owner: "Omkar Bhad",
  year: 2026,
} as const

export const NAV_LINKS = [
  { href: "/#features", id: "features", label: "Features" },
  { href: "/#how", id: "how", label: "How it works" },
  { href: "/#developers", id: "developers", label: "For agents" },
  { href: "/#faq", id: "faq", label: "FAQ" },
] as const
