interface Props {
  activeTab: string
  setActiveTab: (tab: 'timeline' | 'about' | 'connections' | 'photos') => void
}

export const ProfileTabs = ({ activeTab, setActiveTab }: Props) => {
  const tabs = ['timeline', 'about', 'connections', 'photos']

  return (
    <div className="flex justify-center mt-7 border-b bg-white shadow-sm rounded-2xl max-w-4xl w-full overflow-hidden">
      {tabs.map((tab, index) => {
        const isFirst = index === 0
        const isLast = index === tabs.length - 1
        const active = activeTab === tab

        return (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as 'timeline' | 'about' | 'connections' | 'photos')}
            className={`flex-1 py-3 capitalize text-sm font-medium transition-all duration-200 cursor-pointer
              ${
                active
                  ? `text-white bg-orange-500 ${isFirst ? 'rounded-tl-2xl' : ''} ${isLast ? 'rounded-tr-2xl' : ''}`
                  : 'text-gray-600 hover:bg-orange-50'
              }`}
          >
            {tab}
          </button>
        )
      })}
    </div>
  )
}
