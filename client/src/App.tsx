import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { GuestRoute } from '@/components/GuestRoute'
import { MainLayout } from '@/Layout/MainLayout'
import Home from '@/pages/Home'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import Profile from '@/pages/Profile'
import Chat from '@/pages/Chat'
import EditProfile from '@/pages/Profile/EditProfile'
import Suggestions from '@/pages/Suggestions'
import Stories from '@/pages/Stories'
import NotFound from '@/pages/NotFound'
import UserNotFound from '@/pages/UserNotFound'
import { PostDetail } from '@/pages/PostDetail'

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Guest routes - redirect to home if authenticated */}
          <Route 
            path="/login" 
            element={
              <GuestRoute>
                <Login />
              </GuestRoute>
            } 
          />
          <Route 
            path="/register" 
            element={
              <GuestRoute>
                <Register />
              </GuestRoute>
            } 
          />
          
          {/* Protected routes with MainLayout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Home />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile/:username"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Profile />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile/edit"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <EditProfile />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/post/:postId"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <PostDetail />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Chat />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/suggestions"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Suggestions />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/stories"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Stories />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Error pages */}
          <Route path="/user-not-found" element={<UserNotFound />} />
          <Route path="/user-not-found/:username" element={<UserNotFound />} />

          {/* Redirect unknown routes to 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </Router>
  )
}

export default App
