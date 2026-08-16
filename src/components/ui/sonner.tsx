"use client"

import { Toaster as Sonner, ToasterProps } from "sonner"

// The site is light-only (the legacy app never shipped a dark theme, so the
// theme-preference toggle next-themes provided never had an effect here).
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }