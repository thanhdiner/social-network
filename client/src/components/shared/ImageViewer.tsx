import { useState, useEffect, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight, MoreHorizontal, Trash2 } from 'lucide-react'

interface ImageViewerProps {
  images: string[]
  initialIndex: number
  open: boolean
  onClose: () => void
  postId?: string
  updateUrl?: boolean
  onDeleteImage?: (imageIndex: number) => void
  canDelete?: boolean
}

export const ImageViewer = ({ images, initialIndex, open, onClose, postId, updateUrl = false, onDeleteImage, canDelete = false }: ImageViewerProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [menuOpen, setMenuOpen] = useState(false)
  const [originalUrl, setOriginalUrl] = useState<string>('')

  useEffect(() => {
    setCurrentIndex(initialIndex)
  }, [initialIndex])

  useEffect(() => {
    // Save original URL when viewer opens
    if (open && updateUrl) {
      setOriginalUrl(window.location.pathname)
    }
  }, [open, updateUrl])

  useEffect(() => {
    // Update URL when image changes (if updateUrl is true and postId is provided)
    if (open && updateUrl && postId) {
      const newPath = `/post/${postId}/photo/${currentIndex}`
      window.history.replaceState(null, '', newPath)
    }
  }, [currentIndex, open, updateUrl, postId])

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))
  }, [images.length])

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))
  }, [images.length])

  const handleClose = useCallback(() => {
    setMenuOpen(false)
    onClose()
    // Restore original URL when closing (if updateUrl is true and we have original URL)
    if (updateUrl && originalUrl && window.location.pathname.includes('/photo/')) {
      window.history.replaceState(null, '', originalUrl)
    }
  }, [onClose, updateUrl, originalUrl])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      } else if (e.key === 'ArrowLeft') {
        handlePrev()
      } else if (e.key === 'ArrowRight') {
        handleNext()
      }
    }

    const handleClickOutside = () => {
      if (menuOpen) {
        setMenuOpen(false)
      }
    }

    if (open) {
      document.addEventListener('keydown', handleKeyDown)
      document.addEventListener('click', handleClickOutside)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('click', handleClickOutside)
      document.body.style.overflow = 'unset'
    }
  }, [open, handleClose, handlePrev, handleNext, menuOpen])

  const handleDeleteImage = () => {
    if (!onDeleteImage || !window.confirm('Are you sure you want to delete this image?')) return
    
    onDeleteImage(currentIndex)
    setMenuOpen(false)
    
    // If this was the last image or we're at the end, go to previous
    if (images.length === 1) {
      handleClose()
    } else if (currentIndex >= images.length - 1) {
      setCurrentIndex(Math.max(0, currentIndex - 1))
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/95 z-100 flex items-center justify-center">
      {/* Header with counter and actions */}
      <div className="absolute top-4 left-0 right-0 flex items-center justify-between px-4 z-10">
        {/* Image counter */}
        <div className="flex-1" />
        <div className="text-white bg-black/50 px-4 py-2 rounded-full text-sm">
          {currentIndex + 1} / {images.length}
        </div>
        
        {/* Actions */}
        <div className="flex-1 flex items-center justify-end gap-2">
          {canDelete && onDeleteImage && (
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpen(!menuOpen)
                }}
                className="text-white hover:bg-white/10 p-2 rounded-full transition cursor-pointer"
              >
                <MoreHorizontal className="w-6 h-6" />
              </button>
              
              {menuOpen && (
                <div 
                  className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-20"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={handleDeleteImage}
                    className="w-full flex items-center gap-2 px-4 py-2 text-left text-red-600 hover:bg-red-50 cursor-pointer rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Image</span>
                  </button>
                </div>
              )}
            </div>
          )}
          
          <button
            onClick={handleClose}
            className="text-white hover:bg-white/10 p-2 rounded-full transition cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Previous button */}
      {images.length > 1 && (
        <button
          onClick={handlePrev}
          className="absolute left-4 text-white hover:bg-white/10 p-3 rounded-full transition cursor-pointer z-10"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
      )}

      {/* Image */}
      <div className="w-full h-full flex items-center justify-center p-4">
        <img
          src={images[currentIndex]}
          alt={`Image ${currentIndex + 1}`}
          className="max-w-full max-h-full object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Next button */}
      {images.length > 1 && (
        <button
          onClick={handleNext}
          className="absolute right-4 text-white hover:bg-white/10 p-3 rounded-full transition cursor-pointer z-10"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      )}

      {/* Background click to close */}
      <div
        className="absolute inset-0 -z-10"
        onClick={handleClose}
      />
    </div>
  )
}
