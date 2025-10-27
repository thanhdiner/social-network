export default function Chat() {
  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md h-[600px] flex">
        {/* Sidebar - Danh sách chat */}
        <div className="w-1/3 border-r border-gray-200 p-4">
          <h2 className="text-xl font-bold mb-4">Tin nhắn</h2>
          <div className="text-gray-500 text-center mt-10">
            Chức năng chat đang được phát triển...
          </div>
        </div>

        {/* Main chat area */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 p-6 flex items-center justify-center text-gray-500">
            Chọn một cuộc trò chuyện để bắt đầu
          </div>
        </div>
      </div>
    </div>
  );
}
