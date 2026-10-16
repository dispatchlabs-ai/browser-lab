export const metadata = { title: "Remote desktop · Browser Lab" }
export default function DesktopPage() {
  return (
    <iframe
      src="/desktop.html"
      title="Remote desktop"
      className="min-h-0 w-full flex-1 border-0"
    />
  )
}
