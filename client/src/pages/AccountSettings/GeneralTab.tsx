import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import userService from '@/services/userService'
import type { User } from '@/services/authService'
import { Loader2, MailCheck, MailWarning, Share2, UserCog } from 'lucide-react'
import { toast } from 'sonner'

type GeneralFormState = {
  username: string
  fullName: string
  email: string
}

type SocialFormState = {
  website: string
  facebook: string
  twitter: string
  instagram: string
  linkedin: string
}

type EmailFlowState = {
  editing: boolean
  mode: 'verify' | 'change' | null
  newEmail: string
  verificationSent: boolean
  verificationCode: string
  requestLoading: boolean
  confirmLoading: boolean
  devToken: string
  mailSent: boolean
}

const DEFAULT_EMAIL_FLOW: EmailFlowState = {
  editing: false,
  mode: null,
  newEmail: '',
  verificationSent: false,
  verificationCode: '',
  requestLoading: false,
  confirmLoading: false,
  devToken: '',
  mailSent: false
}

const resolveEmailVerification = (payload?: User | null): boolean => {
  if (!payload) return true
  if (typeof payload.emailVerified === 'boolean') return payload.emailVerified
  const maybeVerifiedAt = (payload as { emailVerifiedAt?: string | null }).emailVerifiedAt
  if (maybeVerifiedAt) return true
  return true
}

const extractErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    if (response?.data?.message) {
      return response.data.message
    }
  }
  if (error instanceof Error) {
    return error.message
  }
  return fallback
}

export default function GeneralTab() {
  const { user, refreshUser } = useAuth()
  const [generalData, setGeneralData] = useState<GeneralFormState | null>(null)
  const [socialData, setSocialData] = useState<SocialFormState | null>(null)
  const [initialGeneral, setInitialGeneral] = useState<GeneralFormState | null>(null)
  const [initialSocial, setInitialSocial] = useState<SocialFormState | null>(null)
  const [isGeneralSubmitting, setGeneralSubmitting] = useState(false)
  const [isSocialSubmitting, setSocialSubmitting] = useState(false)
  const [isEmailVerified, setIsEmailVerified] = useState<boolean>(true)
  const [emailFlow, setEmailFlow] = useState<EmailFlowState>(DEFAULT_EMAIL_FLOW)
  const [resendSeconds, setResendSeconds] = useState(0)

  useEffect(() => {
    if (!user) return

    const nextGeneral: GeneralFormState = {
      username: user.username,
      fullName: user.name ?? '',
      email: user.email
    }

    const nextSocial: SocialFormState = {
      website: user.website ?? '',
      facebook: user.facebook ?? '',
      twitter: user.twitter ?? '',
      instagram: user.instagram ?? '',
      linkedin: user.linkedin ?? ''
    }

    setGeneralData(nextGeneral)
    setInitialGeneral(nextGeneral)
    setSocialData(nextSocial)
    setInitialSocial(nextSocial)
    setIsEmailVerified(resolveEmailVerification(user))
    setEmailFlow(DEFAULT_EMAIL_FLOW)
  }, [user])

  const handleGeneralInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setGeneralData(prev => (prev ? { ...prev, fullName: value } : prev))
  }

  const handleGeneralReset = () => {
    if (!initialGeneral) return
    setGeneralData(initialGeneral)
  }

  const handleSocialInputChange = (field: keyof SocialFormState) => (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setSocialData(prev => (prev ? { ...prev, [field]: value } : prev))
  }

  const handleSocialReset = () => {
    if (!initialSocial) return
    setSocialData(initialSocial)
  }

  const handleGeneralSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!generalData) return

    const trimmedName = generalData.fullName.trim()
    if (!trimmedName) {
      toast.error('Vui lòng nhập họ tên hiển thị')
      return
    }

    setGeneralSubmitting(true)
    try {
      await userService.updateProfile({ name: trimmedName })
      await refreshUser()

      const syncedState: GeneralFormState = {
        ...generalData,
        fullName: trimmedName
      }

      setGeneralData(syncedState)
      setInitialGeneral(syncedState)
      toast.success('Thông tin tài khoản đã được cập nhật')
    } catch (error) {
      const message = extractErrorMessage(error, 'Cập nhật thất bại, vui lòng thử lại')
      toast.error(message)
    } finally {
      setGeneralSubmitting(false)
    }
  }

  const handleSocialSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!socialData) return

    setSocialSubmitting(true)
    try {
      await userService.updateProfile({
        website: socialData.website.trim() || undefined,
        facebook: socialData.facebook.trim() || undefined,
        instagram: socialData.instagram.trim() || undefined,
        twitter: socialData.twitter.trim() || undefined,
        linkedin: socialData.linkedin.trim() || undefined
      })
      await refreshUser()

      setInitialSocial(socialData)
      toast.success('Liên kết mạng xã hội đã được cập nhật')
    } catch (error) {
      const message = extractErrorMessage(error, 'Cập nhật thất bại, vui lòng thử lại')
      toast.error(message)
    } finally {
      setSocialSubmitting(false)
    }
  }

  const startEmailFlow = (mode: 'verify' | 'change') => {
    if (!generalData) return
    setEmailFlow({
      ...DEFAULT_EMAIL_FLOW,
      editing: true,
      mode,
      newEmail: mode === 'verify' ? generalData.email : ''
    })
  }

  const cancelEmailFlow = () => {
    setEmailFlow(DEFAULT_EMAIL_FLOW)
    setResendSeconds(0)
  }

  const handleRequestEmailCode = async () => {
    if (!emailFlow.editing) return

    const trimmedEmail = emailFlow.newEmail.trim()
    if (!trimmedEmail) {
      toast.error('Vui lòng nhập email mới')
      return
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailPattern.test(trimmedEmail)) {
      toast.error('Email không hợp lệ')
      return
    }

    setEmailFlow(prev => ({ ...prev, requestLoading: true }))
    try {
      const result = await userService.requestEmailChange(trimmedEmail)
      setEmailFlow(prev => ({
        ...prev,
        newEmail: trimmedEmail,
        verificationSent: true,
        verificationCode: '',
        requestLoading: false,
        devToken: result.debugToken ?? '',
        mailSent: result.mailSent
      }))
      // start 60s cooldown for resending
      setResendSeconds(60)
      toast.success(result.message || 'Đã gửi mã xác thực tới email của bạn')
      if (!result.mailSent && result.debugToken) {
        toast.message(`Mã debug: ${result.debugToken}`)
      }
    } catch (error) {
      setEmailFlow(prev => ({
        ...prev,
        requestLoading: false,
        verificationSent: false,
        mailSent: false,
        devToken: ''
      }))
      const message = extractErrorMessage(error, 'Không thể gửi mã xác thực, vui lòng thử lại')
      toast.error(message)
    }
  }

  // resend countdown effect for account settings
  useEffect(() => {
    if (resendSeconds <= 0) return undefined
    const id = setInterval(() => {
      setResendSeconds(s => {
        if (s <= 1) {
          clearInterval(id)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [resendSeconds])

  const handleConfirmEmailChange = async () => {
    if (!emailFlow.editing) return

    const trimmedCode = emailFlow.verificationCode.trim()
    if (!trimmedCode) {
      toast.error('Vui lòng nhập mã xác thực')
      return
    }

    setEmailFlow(prev => ({ ...prev, confirmLoading: true }))
    try {
      const updatedUser = await userService.confirmEmailChange(trimmedCode)
      await refreshUser()

      setGeneralData(prev => (prev ? { ...prev, email: updatedUser.email } : prev))
      setInitialGeneral(prev => (prev ? { ...prev, email: updatedUser.email } : prev))
      setIsEmailVerified(resolveEmailVerification(updatedUser))
      toast.success('Email đã được cập nhật và xác thực!')
      setEmailFlow(DEFAULT_EMAIL_FLOW)
      setResendSeconds(0)
    } catch (error) {
      setEmailFlow(prev => ({ ...prev, confirmLoading: false }))
      const message = extractErrorMessage(error, 'Xác nhận email thất bại, vui lòng thử lại')
      toast.error(message)
    }
  }

  if (!user || !generalData || !socialData) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-orange-200 bg-white">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
          Đang tải thông tin tài khoản...
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <form onSubmit={handleGeneralSubmit} className="space-y-6 rounded-2xl border border-orange-100 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-orange-600">
              <UserCog className="h-5 w-5" />
              <span className="text-sm font-semibold uppercase tracking-wide">Account Setting</span>
            </div>
            <h2 className="mt-2 text-2xl font-semibold text-gray-900">Thông tin tài khoản</h2>
            <p className="text-sm text-gray-500">Quản lý thông tin đăng nhập và địa chỉ email của bạn.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="account-username">User Name</Label>
            <Input
              id="account-username"
              value={generalData.username}
              disabled
              className="cursor-not-allowed bg-gray-100"
            />
          </div>

          <div className="space-y-3 rounded-2xl border border-orange-100 bg-orange-50/40 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Email Id</p>
                <p className="text-lg font-semibold text-gray-900 break-all">{generalData.email}</p>
              </div>
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                  isEmailVerified ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                }`}
              >
                {isEmailVerified ? <MailCheck className="h-4 w-4" /> : <MailWarning className="h-4 w-4" />}
                {isEmailVerified ? 'Đã xác thực' : 'Chưa xác thực'}
              </span>
            </div>

            {!emailFlow.editing ? (
              <div className="flex flex-wrap gap-2 pt-2">
                {!isEmailVerified && (
                  <Button
                    type="button"
                    className="bg-orange-600 text-white hover:bg-orange-700 cursor-pointer"
                    onClick={() => startEmailFlow('verify')}
                  >
                    Xác thực email
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => startEmailFlow('change')}
                  className="hover:border-orange-300 hover:text-orange-600 cursor-pointer"
                >
                  Thay đổi email
                </Button>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="account-new-email">Email mới</Label>
                  <Input
                    id="account-new-email"
                    type="email"
                    autoComplete="email"
                    value={emailFlow.newEmail}
                    onChange={event => setEmailFlow(prev => ({ ...prev, newEmail: event.target.value }))}
                    placeholder="name@example.com"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={handleRequestEmailCode}
                    className="bg-orange-600 text-white hover:bg-orange-700 cursor-pointer"
                    disabled={emailFlow.requestLoading || resendSeconds > 0}
                  >
                    {emailFlow.requestLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Đang gửi...
                      </>
                    ) : resendSeconds > 0 ? (
                      `Gửi lại (${resendSeconds}s)`
                    ) : emailFlow.verificationSent ? (
                      'Gửi lại mã'
                    ) : (
                      'Gửi mã xác thực'
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={cancelEmailFlow}
                    className="hover:border-orange-300 hover:text-orange-600 cursor-pointer"
                    disabled={emailFlow.requestLoading || emailFlow.confirmLoading}
                  >
                    Hủy
                  </Button>
                </div>

                {emailFlow.verificationSent && (
                  <div className="space-y-2">
                    <Label htmlFor="account-email-code">Mã xác thực</Label>
                    <Input
                      id="account-email-code"
                      value={emailFlow.verificationCode}
                      onChange={event => setEmailFlow(prev => ({ ...prev, verificationCode: event.target.value }))}
                      placeholder="Nhập mã xác thực"
                    />
                    {resendSeconds > 0 && (
                      <p className="text-xs text-orange-600">Bạn có thể gửi lại sau {resendSeconds}s</p>
                    )}
                    <p className="text-xs text-gray-500">
                      {emailFlow.mailSent
                        ? 'Kiểm tra hộp thư đến của bạn để lấy mã xác thực.'
                        : 'Email service đang tắt nên dùng mã debug hoặc liên hệ quản trị viên.'}
                    </p>
                    <Button
                      type="button"
                      onClick={handleConfirmEmailChange}
                      className="bg-orange-600 text-white hover:bg-orange-700 cursor-pointer"
                      disabled={emailFlow.confirmLoading}
                    >
                      {emailFlow.confirmLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Đang xác nhận...
                        </>
                      ) : (
                        'Xác nhận email'
                      )}
                    </Button>
                    {emailFlow.devToken && (
                      <p className="text-xs text-gray-500">
                        Mã dùng thử (dev): <span className="font-mono">{emailFlow.devToken}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="account-full-name">Full Name</Label>
            <Input
              id="account-full-name"
              value={generalData.fullName}
              onChange={handleGeneralInputChange}
              placeholder="Nhập tên hiển thị"
              autoComplete="name"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-4">
          <Button
            type="submit"
            className="bg-orange-600 text-white hover:bg-orange-700 cursor-pointer"
            disabled={isGeneralSubmitting}
          >
            {isGeneralSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang lưu...
              </>
            ) : (
              'Submit'
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleGeneralReset}
            className="hover:border-orange-300 hover:text-orange-600 cursor-pointer"
            disabled={isGeneralSubmitting}
          >
            Cancel
          </Button>
        </div>
      </form>

      <form onSubmit={handleSocialSubmit} className="space-y-6 rounded-2xl border border-orange-100 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-orange-600">
              <Share2 className="h-5 w-5" />
              <span className="text-sm font-semibold uppercase tracking-wide">Social Media</span>
            </div>
            <h2 className="mt-2 text-2xl font-semibold text-gray-900">Liên kết mạng xã hội</h2>
            <p className="text-sm text-gray-500">Giúp bạn bè tìm thấy bạn qua các nền tảng khác.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="social-website">Website</Label>
            <Input
              id="social-website"
              value={socialData.website}
              onChange={handleSocialInputChange('website')}
              placeholder="https://yourdomain.com"
              autoComplete="url"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="social-facebook">Facebook</Label>
            <Input
              id="social-facebook"
              value={socialData.facebook}
              onChange={handleSocialInputChange('facebook')}
              placeholder="facebook.com/username"
              autoComplete="url"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="social-twitter">Twitter</Label>
            <Input
              id="social-twitter"
              value={socialData.twitter}
              onChange={handleSocialInputChange('twitter')}
              placeholder="twitter.com/username"
              autoComplete="url"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="social-instagram">Instagram</Label>
            <Input
              id="social-instagram"
              value={socialData.instagram}
              onChange={handleSocialInputChange('instagram')}
              placeholder="instagram.com/username"
              autoComplete="url"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="social-linkedin">LinkedIn</Label>
            <Input
              id="social-linkedin"
              value={socialData.linkedin}
              onChange={handleSocialInputChange('linkedin')}
              placeholder="linkedin.com/in/username"
              autoComplete="url"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-4">
          <Button
            type="submit"
            className="bg-orange-600 text-white hover:bg-orange-700 cursor-pointer"
            disabled={isSocialSubmitting}
          >
            {isSocialSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang lưu...
              </>
            ) : (
              'Submit'
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleSocialReset}
            className="hover:border-orange-300 hover:text-orange-600 cursor-pointer"
            disabled={isSocialSubmitting}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
