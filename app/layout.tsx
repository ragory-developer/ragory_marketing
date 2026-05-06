import './globals.css'
import { Toaster } from 'react-hot-toast'

export const metadata = {
  title: 'Marketing Portal',
  description: 'In-house marketing management portal',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  )
}
