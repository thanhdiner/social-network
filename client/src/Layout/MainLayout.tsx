import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { Header } from '../components/Layout/Header.tsx'
import { LeftSidebar } from '../components/Layout/LeftSidebar.tsx'
import { RightSidebar } from '../components/Layout/RightSidebar.tsx'

interface MainLayoutProps {
  children?: ReactNode
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const location = useLocation()
  const mainRef = useRef<HTMLDivElement>(null)
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('leftSidebarOpen')
    if (saved !== null) {
      return JSON.parse(saved)
    }
    // Mặc định: mở trên desktop (>= 768px), đóng trên mobile
    return window.innerWidth >= 768
  })

  // Save sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem('leftSidebarOpen', JSON.stringify(isLeftSidebarOpen))
  }, [isLeftSidebarOpen])

  // Reset scroll position when route changes
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0
    }
  }, [location.pathname])

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <Header onToggleSidebar={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)} />

      {/* Body */}
      <div className="flex flex-1 overflow-hidden bg-gray-50 relative">
        {/* Left Sidebar - Desktop */}
        <aside 
          className={`fixed left-0 top-[65px] bottom-0 border-r bg-white overflow-y-auto transition-all duration-300 z-30 hidden md:block ${
            isLeftSidebarOpen ? 'w-64' : 'w-20'
          }`}
        >
          <LeftSidebar isCollapsed={!isLeftSidebarOpen} />
        </aside>

        {/* Left Sidebar - Mobile (toggle) */}
        {isLeftSidebarOpen && (
          <>
            {/* Overlay */}
            <div 
              className="fixed inset-0 bg-black/50 z-40 md:hidden animate-in fade-in duration-200"
              onClick={() => setIsLeftSidebarOpen(false)}
            />
            
            {/* Sidebar */}
            <aside className="fixed left-0 top-[65px] bottom-0 w-64 bg-white z-50 overflow-y-auto md:hidden shadow-xl animate-in slide-in-from-left duration-300">
              <LeftSidebar isCollapsed={false} />
            </aside>
          </>
        )}

        {/* Main content area */}
        <main 
          ref={mainRef} 
          className="flex-1 overflow-y-auto p-4 md:pl-8 md:ml-62"
        >
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
