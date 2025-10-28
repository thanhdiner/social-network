import { UserX, Home, Search, ArrowLeft } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTitle } from '@/hooks/useTitle'

export default function UserNotFound() {
  const { username } = useParams()
  useTitle('User Not Found')
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-linear-to-br from-orange-50 via-white to-orange-100 flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative bg-white/80 backdrop-blur-xl border border-orange-100 rounded-3xl shadow-2xl p-10 text-center max-w-lg w-full"
      >
        {/* Glow circle background */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-56 h-56 bg-linear-to-br from-orange-400/30 to-amber-200/20 rounded-full blur-3xl animate-pulse" />

        {/* Icon */}
        <div className="relative z-10 flex justify-center mb-6">
          <div className="bg-linear-to-br from-orange-100 to-amber-50 p-6 rounded-full shadow-inner">
            <UserX className="w-16 h-16 text-orange-500" strokeWidth={1.5} />
          </div>
        </div>

        {/* Text */}
        <h1 className="text-3xl font-bold text-gray-800 mb-2">User Not Found</h1>
        {username && (
          <p className="text-lg text-gray-600 mb-1">
            User <span className="font-semibold text-orange-500">@{username}</span> doesn’t exist
          </p>
        )}
        <p className="text-gray-500 mb-10">The user may have been deleted or the username might be incorrect.</p>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row justify-center gap-4 mb-10">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-orange-500 text-orange-500 font-medium hover:bg-orange-50 hover:scale-[1.02] transition-all cursor-pointer"
          >
            <ArrowLeft size={18} />
            Go Back
          </button>

          <Link
            to="/"
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-linear-to-r from-orange-500 to-amber-500 text-white! font-semibold shadow-md hover:shadow-lg hover:scale-[1.03] trapnsition-all"
          >
            <Home size={18} />
            Home Page
          </Link>
        </div>

        {/* Suggestion section */}
        <div className="border-t border-gray-200 pt-6">
          <p className="text-sm text-gray-600 mb-3">Looking for someone?</p>
          <Link
            to="/suggestions"
            className="inline-flex items-center gap-2 text-orange-500 hover:text-orange-600 font-medium transition-colors"
          >
            <Search size={18} />
            Discover People
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
