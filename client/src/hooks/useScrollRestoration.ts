import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

const scrollPositions: { [key: string]: number } = {}

export const useScrollRestoration = () => {
  const location = useLocation()
  const scrollKey = location.pathname
  const isFirstRender = useRef(true)

  useEffect(() => {
    // Restore scroll position when component mounts
    if (isFirstRender.current) {
      isFirstRender.current = false
      const savedPosition = scrollPositions[scrollKey] || 0
      window.scrollTo(0, savedPosition)
    }

    // Save scroll position when component unmounts or location changes
    return () => {
      scrollPositions[scrollKey] = window.scrollY
    }
  }, [scrollKey])
}
