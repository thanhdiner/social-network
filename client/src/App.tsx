import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/contexts/AuthContext'
import { ChatProvider } from '@/contexts/ChatContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { GuestRoute } from '@/components/GuestRoute'
import { MainLayout } from '@/Layout/MainLayout'
import Home from '@/pages/Home'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import ForgotPassword from '@/pages/ForgotPassword'
import ResetPassword from '@/pages/ResetPassword'
import Profile from '@/pages/Profile'
import Chat from '@/pages/Chat'
import EditProfile from '@/pages/Profile/EditProfile'
import Suggestions from '@/pages/Suggestions'
import Stories from '@/pages/Stories'
import NotFound from '@/pages/NotFound'
import UserNotFound from '@/pages/UserNotFound'
import { PostDetail } from '@/pages/PostDetail'
import { SearchResults } from '@/pages/Search'
import AccountSettings from '@/pages/AccountSettings'
import ReelsPage from '@/pages/Reels'
import CreateReelPage from '@/pages/Reels/CreateReel'
import NotificationsPage from '@/pages/Notifications'
import NotificationsDetailPage from '@/pages/Notifications/Detail'
import FriendsPage from '@/pages/Friends'
import { VoiceCallModal } from '@/components/shared/VoiceCallModal'
import { VideoCallModal } from '@/components/shared/VideoCallModal'
import { AdminRoute } from '@/components/AdminRoute'
import { AdminLayout } from '@/pages/Admin/AdminLayout'
import AdminLogin from '@/pages/Admin/AdminLogin'
import AdminDashboard from '@/pages/Admin/AdminDashboard'
import AdminUsers from '@/pages/Admin/AdminUsers'
import AdminPosts from '@/pages/Admin/AdminPosts'
import AdminReels from '@/pages/Admin/AdminReels'
import '@/pages/Admin/admin.css'

function App() {
  return (
    <Router>
      <AuthProvider>
        <ChatProvider>
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
          <Route 
            path="/forgot-password" 
            element={
              <GuestRoute>
                <ForgotPassword />
              </GuestRoute>
            } 
          />
          <Route 
            path="/reset-password" 
            element={
              <GuestRoute>
                <ResetPassword />
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
            path="/post/:postId/photo/:photoIndex"
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
            path="/settings/account"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <AccountSettings />
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

          <Route
            path="/search"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <SearchResults />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <NotificationsPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/notifications/:notificationId"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <NotificationsDetailPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/reels"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <ReelsPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Allow deep linking to a specific reel while keeping the Reels feed mounted */}
          <Route
            path="/reels/:reelId"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <ReelsPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/reels/create"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <CreateReelPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/friends"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <FriendsPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Admin routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminLayout>
                  <AdminDashboard />
                </AdminLayout>
              </AdminRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <AdminRoute>
                <AdminLayout>
                  <AdminUsers />
                </AdminLayout>
              </AdminRoute>
            }
          />
          <Route
            path="/admin/posts"
            element={
              <AdminRoute>
                <AdminLayout>
                  <AdminPosts />
                </AdminLayout>
              </AdminRoute>
            }
          />
          <Route
            path="/admin/reels"
            element={
              <AdminRoute>
                <AdminLayout>
                  <AdminReels />
                </AdminLayout>
              </AdminRoute>
            }
          />

          {/* Error pages */}
          <Route path="/user-not-found" element={<UserNotFound />} />
          <Route path="/user-not-found/:username" element={<UserNotFound />} />

          {/* Redirect unknown routes to 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
  {/* Global call modals */}
  <VoiceCallModal />
  <VideoCallModal />
  {/* Toast notifications */}
  <Toaster position="top-right" richColors closeButton />
        </ChatProvider>
      </AuthProvider>
    </Router>
  )
}

export default App
