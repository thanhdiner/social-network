import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BellRing, Lock, UserCog } from 'lucide-react'
import GeneralTab from './GeneralTab'

export default function AccountSettingsPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
        <p className="text-sm text-gray-500">
          Quản lý thông tin cá nhân, bảo mật và các thông báo cho tài khoản của bạn.
        </p>
      </header>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-1 gap-2 rounded-2xl border border-orange-100 bg-white p-1 shadow-sm sm:grid-cols-3">
          <TabsTrigger
            value="general"
            className="flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-gray-600 transition data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-sm cursor-pointer"
          >
            <UserCog className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger
            value="security"
            className="flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-gray-600 transition data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-sm cursor-pointer"
          >
            <Lock className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-gray-600 transition data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-sm cursor-pointer"
          >
            <BellRing className="h-4 w-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <GeneralTab />
        </TabsContent>

        <TabsContent value="security">
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-orange-200 bg-white p-10 text-center text-sm text-gray-500">
            <Lock className="h-6 w-6 text-orange-500" />
            Tính năng bảo mật sẽ sớm được cập nhật.
          </div>
        </TabsContent>

        <TabsContent value="notifications">
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-orange-200 bg-white p-10 text-center text-sm text-gray-500">
            <BellRing className="h-6 w-6 text-orange-500" />
            Tùy chỉnh thông báo sẽ sớm được bổ sung.
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
