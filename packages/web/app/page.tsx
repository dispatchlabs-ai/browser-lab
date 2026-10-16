import { PairingGate } from "@/components/pairing-gate"
import type { Metadata } from "next"
import { Chat } from "@/components/chat"
export const metadata: Metadata = {
  title: "Browser Lab",
  description:
    "A Pi Durable agent controls Chrome and a desktop through a browser tab.",
}
export default function Page() {
  return (
    <PairingGate>
      <Chat />
    </PairingGate>
  )
}
