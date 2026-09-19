'use client'

import * as Popover from '@radix-ui/react-popover'
import { Info } from 'lucide-react'

interface InfoTooltipProps {
  label: string
  content: string
}

export function InfoTooltip({ label, content }: InfoTooltipProps) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={label}
          className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="top"
          align="center"
          sideOffset={6}
          className="z-[100] max-w-[260px] rounded-lg border bg-white px-3 py-2 text-xs leading-relaxed text-gray-700 shadow-lg"
        >
          {content}
          <Popover.Arrow className="fill-white" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
