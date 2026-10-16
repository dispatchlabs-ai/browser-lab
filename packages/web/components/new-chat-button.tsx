"use client"
import { PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
export function NewChatButton() {
  return (
    <Button
      variant="secondary"
      onClick={() => {
        localStorage.removeItem("browser-lab-conversation")
        location.reload()
      }}
    >
      <PlusIcon data-icon="inline-start" />
      New chat
    </Button>
  )
}
