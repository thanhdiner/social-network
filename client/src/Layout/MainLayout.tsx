import type { ReactNode } from 'react'
import { Header } from '../components/Layout/Header.tsx'
import { LeftSidebar } from '../components/Layout/LeftSidebar.tsx'
import { RightSidebar } from '../components/Layout/RightSidebar.tsx'

interface MainLayoutProps {
  children?: ReactNode
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <Header />

      {/* Body */}
      <div className="flex flex-1 overflow-hidden bg-gray-50">
        {/* Left Sidebar */}
        <aside className="w-64 border-r bg-white overflow-y-auto hidden md:block">
          <LeftSidebar />
        </aside>

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto p-4">
          {/* Middle content */}
          <div className="max-w-3xl mx-auto space-y-4">{children}</div>
        </main>

        {/* Right Sidebar */}
        <aside className="w-80 border-l bg-white overflow-y-auto hidden lg:block">
          <RightSidebar />
        </aside>
      </div>
    </div>
  )
}
