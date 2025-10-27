import { UserX, Home, Search, ArrowLeft } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTitle } from '@/hooks/useTitle'

const UserNotFound = () => {
  const { username } = useParams()
  useTitle('User Not Found')
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-linear-to-br from-orange-50 to-orange-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-orange-500 rounded-full opacity-20 animate-pulse"></div>
            <div className="relative bg-orange-100 rounded-full p-6">
              <UserX className="w-16 h-16 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Message */}
        <h1 className="text-3xl font-bold text-gray-800 mb-3">
          User Not Found
        </h1>
        {username && (
          <p className="text-lg text-gray-600 mb-2">
            User <span className="font-semibold text-orange-500">@{username}</span> does not exist
          </p>
        )}
        <p className="text-gray-500 mb-8">
          This user may have been deleted or the username is incorrect.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
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

        {/* Suggestions */}
        <div className="pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-4">Looking for someone?</p>
          <Link
            to="/suggestions"
            className="inline-flex items-center gap-2 text-orange-500 hover:text-orange-600 font-medium transition-colors"
          >
            <Search size={18} />
            Discover People
          </Link>
        </div>
      </div>
    </div>
  )
}

export default UserNotFound
