import { AlertTriangle, ArrowLeft, Home } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTitle } from '@/hooks/useTitle'

export default function NotFound() {
  useTitle('404 - Not Found')
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="bg-white/80 backdrop-blur-xl shadow-2xl rounded-3xl p-10 text-center max-w-lg w-full border border-orange-100"
      >
        {/* Icon */}
        <div className="relative flex justify-center mb-8">
          <div className="absolute inset-0 w-24 h-24 bg-orange-400/20 rounded-full blur-3xl animate-pulse" />
          <div className="relative bg-orange-100 rounded-full p-5 shadow-inner">
            <AlertTriangle className="w-12 h-12 text-orange-500" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-[5rem] leading-none font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-600 drop-shadow-sm mb-4">
          404
        </h1>

        <h2 className="text-2xl font-semibold text-gray-800 mb-3">Oops! Page not found</h2>
        <p className="text-gray-500 mb-10">The page you are looking for doesn’t exist or might have been moved.</p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="cursor-pointer flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-orange-400 text-orange-500 hover:bg-orange-50 font-medium transition-all"
          >
            <ArrowLeft size={18} />
            Go Back
          </button>

          <Link
            to="/"
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-linear-to-r from-orange-500 to-amber-500 text-white! font-medium shadow-md hover:shadow-lg hover:scale-[1.02] transition-all"
          >
            <Home size={18} />
            Home Page
          </Link>
        </div>

        {/* Footer */}
        <p className="text-xs text-gray-400 mt-10">
          Need help? <span className="text-orange-500 font-medium cursor-pointer hover:underline">Contact support</span>
        </p>
      </motion.div>
    </div>
  )
}
