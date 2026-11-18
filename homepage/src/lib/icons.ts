// Phosphor icons (regular), inlined as SVG strings.
import arrowRight from "@phosphor-icons/core/regular/arrow-right.svg?raw"
import arrowUpRight from "@phosphor-icons/core/regular/arrow-up-right.svg?raw"
import downloadSimple from "@phosphor-icons/core/regular/download-simple.svg?raw"
import githubLogo from "@phosphor-icons/core/regular/github-logo.svg?raw"
import check from "@phosphor-icons/core/regular/check.svg?raw"
import plus from "@phosphor-icons/core/regular/plus.svg?raw"
import list from "@phosphor-icons/core/regular/list.svg?raw"
import x from "@phosphor-icons/core/regular/x.svg?raw"
import terminalWindow from "@phosphor-icons/core/regular/terminal-window.svg?raw"
import robot from "@phosphor-icons/core/regular/robot.svg?raw"
import lockSimple from "@phosphor-icons/core/regular/lock-simple.svg?raw"
import code from "@phosphor-icons/core/regular/code.svg?raw"
import scales from "@phosphor-icons/core/regular/scales.svg?raw"
import caretDown from "@phosphor-icons/core/regular/caret-down.svg?raw"
import sealCheck from "@phosphor-icons/core/regular/seal-check.svg?raw"
import buildings from "@phosphor-icons/core/regular/buildings.svg?raw"
import appleLogo from "@phosphor-icons/core/regular/apple-logo.svg?raw"
import windowsLogo from "@phosphor-icons/core/regular/windows-logo.svg?raw"
import linuxLogo from "@phosphor-icons/core/regular/linux-logo.svg?raw"

export const ICONS = {
  "arrow-right": arrowRight,
  "arrow-up-right": arrowUpRight,
  "download-simple": downloadSimple,
  "github-logo": githubLogo,
  "check": check,
  "plus": plus,
  "list": list,
  "x": x,
  "terminal-window": terminalWindow,
  "robot": robot,
  "lock-simple": lockSimple,
  "code": code,
  "scales": scales,
  "caret-down": caretDown,
  "seal-check": sealCheck,
  "buildings": buildings,
  "apple-logo": appleLogo,
  "windows-logo": windowsLogo,
  "linux-logo": linuxLogo,
} as const

export type IconName = keyof typeof ICONS
