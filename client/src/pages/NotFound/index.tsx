import { AlertCircle, Home, ArrowLeft } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useTitle } from '@/hooks/useTitle'

const NotFound = () => {
  useTitle('404 - Page Not Found')
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-linear-to-br from-orange-50 to-orange-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-orange-500 rounded-full opacity-20 animate-ping"></div>
            <div className="relative bg-orange-100 rounded-full p-6">
              <AlertCircle className="w-16 h-16 text-orange-500" />
            </div>
          </div>
        </div>

        {/* 404 Text */}
        <h1 className="text-7xl font-bold text-orange-500 mb-4">404</h1>
        
        {/* Message */}
        <h2 className="text-2xl font-semibold text-gray-800 mb-3">
          Oops! Page Not Found
        </h2>
        <p className="text-gray-600 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 px-6 py-3 border-2 border-orange-500 text-orange-500 rounded-lg font-medium hover:bg-orange-50 transition-all duration-200"
          >
            <ArrowLeft size={20} />
            Go Back
          </button>
          <Link
            to="/"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <Home size={20} />
            Home Page
          </Link>
        </div>

        {/* Decorative Elements */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            If you believe this is an error, please contact support.
          </p>
        </div>
      </div>
    </div>
  )
}

export default NotFound
