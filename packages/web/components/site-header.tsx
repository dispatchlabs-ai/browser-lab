import Link from "next/link"
import { NewChatButton } from "@/components/new-chat-button"
export function SiteHeader() {
  return (
    <header className="flex items-center justify-between gap-2 border-b px-6 py-3">
      <Link href="/" className="text-sm font-semibold">
        Browser Lab{" "}
        <span className="ml-2 font-normal text-muted-foreground">
          / experiment 01
        </span>
      </Link>
      <div className="flex items-center gap-4">
        <a href="/desktop" target="_blank" rel="noreferrer" className="text-sm">
          Desktop ↗
        </a>
        <NewChatButton />
      </div>
    </header>
  )
}
