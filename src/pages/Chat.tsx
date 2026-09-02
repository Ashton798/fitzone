import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Send, ArrowLeft, UserPlus, Search, MoreVertical,
  User, Phone, Video, Image, Smile, Check
} from 'lucide-react';
import { messagesApi, friendsApi } from '@/lib/api';
import { getToken } from '@/lib/api';

interface Conversation {
  user_id: string;
  nickname: string;
  avatar: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read_at?: string;
}

const Chat = () => {
  const navigate = useNavigate();
  const { userId: chatUserId } = useParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(chatUserId || null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isLoggedIn = !!getToken();

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    loadData();
  }, [isLoggedIn]);

  useEffect(() => {
    if (selectedUserId) {
      loadMessages(selectedUserId);
    }
  }, [selectedUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [convResult, friendsResult, pendingResult] = await Promise.all([
        messagesApi.getConversations(),
        friendsApi.getFriends(),
        friendsApi.getPendingRequests(),
      ]);
      setConversations(convResult);
      setFriends(friendsResult);
      setPendingRequests(pendingResult);
    } catch (error) {
      console.error('加载聊天数据失败:', error);
    }
    setLoading(false);
  };

  const loadMessages = async (userId: string) => {
    try {
      const result = await messagesApi.getMessages(userId);
      setMessages(result);
    } catch (error) {
      console.error('加载消息失败:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedUserId) return;

    try {
      const result = await messagesApi.sendMessage(selectedUserId, newMessage.trim());
      setMessages([...messages, result]);
      setNewMessage('');
      // 更新聊天列表
      loadData();
    } catch (error) {
      console.error('发送消息失败:', error);
    }
  };

  const handleSearchUsers = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const results = await friendsApi.searchUsers(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('搜索用户失败:', error);
    }
  };

  const handleSendFriendRequest = async (friendId: string) => {
    try {
      await friendsApi.sendFriendRequest(friendId);
      setShowAddFriendModal(false);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error: any) {
      alert(error.message || '发送好友请求失败');
    }
  };

  const handleAcceptFriend = async (requestId: string) => {
    try {
      await friendsApi.acceptFriendRequest(requestId);
      loadData();
    } catch (error) {
      console.error('接受好友请求失败:', error);
    }
  };

  const handleRejectFriend = async (requestId: string) => {
    try {
      await friendsApi.rejectFriendRequest(requestId);
      setPendingRequests(pendingRequests.filter(r => r.request_id !== requestId));
    } catch (error) {
      console.error('拒绝好友请求失败:', error);
    }
  };

  const getSelectedUser = () => {
    if (!selectedUserId) return null;
    return conversations.find(c => c.user_id === selectedUserId) || friends.find(f => f.id === selectedUserId);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60 * 1000) return '刚刚';
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60 / 1000)}分钟前`;
    if (diff < 24 * 60 * 60 * 1000) return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
  };

  if (!isLoggedIn) return null;

  return (
    <div className="min-h-screen bg-dark-100">
      <div className="max-w-7xl mx-auto h-[calc(100vh-120px)] flex">
        {/* Left Sidebar - Conversations */}
        <div className="w-80 bg-white rounded-l-3xl border border-dark-300 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-dark-300">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-dark-900">私信</h2>
              <div className="flex gap-2">
                {pendingRequests.length > 0 && (
                  <div className="px-2 py-1 bg-primary-50 text-primary-700 rounded-lg text-xs">
                    {pendingRequests.length} 个好友请求
                  </div>
                )}
                <button
                  onClick={() => setShowAddFriendModal(true)}
                  className="w-8 h-8 rounded-lg bg-dark-100 flex items-center justify-center text-dark-500 hover:text-primary-700 transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {/* Friends Section */}
            {friends.length > 0 && (
              <div className="p-2">
                <div className="text-xs text-dark-500 px-3 py-2">好友</div>
                {friends.map((friend) => (
                  <button
                    key={friend.id}
                    onClick={() => setSelectedUserId(friend.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                      selectedUserId === friend.id
                        ? 'bg-primary-50 text-primary-700'
                        : 'hover:bg-dark-100 text-dark-700'
                    }`}
                  >
                    <img
                      src={friend.avatar}
                      alt={friend.nickname}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="flex-1 text-left">
                      <div className="font-medium">{friend.nickname}</div>
                      <div className="text-xs text-dark-500">Lv.{friend.level}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Conversations Section */}
            {conversations.length > 0 && (
              <div className="p-2">
                <div className="text-xs text-dark-500 px-3 py-2">最近聊天</div>
                {conversations.map((conv) => (
                  <button
                    key={conv.user_id}
                    onClick={() => setSelectedUserId(conv.user_id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                      selectedUserId === conv.user_id
                        ? 'bg-primary-50 text-primary-700'
                        : 'hover:bg-dark-100 text-dark-700'
                    }`}
                  >
                    <img
                      src={conv.avatar}
                      alt={conv.nickname}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="flex-1 text-left">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{conv.nickname}</span>
                        <span className="text-xs text-dark-500">{formatTime(conv.last_message_time)}</span>
                      </div>
                      <div className="text-xs text-dark-500 truncate">{conv.last_message}</div>
                    </div>
                    {conv.unread_count > 0 && (
                      <div className="w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center text-xs text-white">
                        {conv.unread_count}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Empty State */}
            {friends.length === 0 && conversations.length === 0 && (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center text-dark-500">
                  <UserPlus className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>还没有好友</p>
                  <button
                    onClick={() => setShowAddFriendModal(true)}
                    className="mt-4 text-primary-600 hover:text-primary-700"
                  >
                    添加好友开始聊天
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right - Chat Area */}
        <div className="flex-1 bg-white rounded-r-3xl border border-dark-300 border-l-0 flex flex-col">
          {selectedUserId ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-dark-300 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={getSelectedUser()?.avatar}
                    alt={getSelectedUser()?.nickname}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <div className="font-semibold text-dark-900">{getSelectedUser()?.nickname}</div>
                    <div className="text-xs text-dark-500">Lv.{getSelectedUser()?.level || 1}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="w-8 h-8 rounded-lg bg-dark-100 flex items-center justify-center text-dark-500 hover:text-dark-900 transition-colors">
                    <Phone className="w-4 h-4" />
                  </button>
                  <button className="w-8 h-8 rounded-lg bg-dark-100 flex items-center justify-center text-dark-500 hover:text-dark-900 transition-colors">
                    <Video className="w-4 h-4" />
                  </button>
                  <button className="w-8 h-8 rounded-lg bg-dark-100 flex items-center justify-center text-dark-500 hover:text-dark-900 transition-colors">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-dark-500">
                    <div className="text-center">
                      <User className="w-16 h-16 mx-auto mb-4 opacity-30" />
                      <p>开始和 {getSelectedUser()?.nickname} 聊天吧</p>
                    </div>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMine = msg.sender_id !== selectedUserId;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] px-4 py-3 rounded-2xl ${
                            isMine
                              ? 'bg-primary-500 text-white rounded-br-md'
                              : 'bg-dark-100 text-dark-800 rounded-bl-md'
                          }`}
                        >
                          <div>{msg.content}</div>
                          <div className={`text-xs mt-1 ${isMine ? 'text-primary-100' : 'text-dark-500'}`}>
                            {formatTime(msg.created_at)}
                            {isMine && msg.read_at && (
                              <Check className="w-3 h-3 inline ml-1" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 border-t border-dark-300">
                <div className="flex items-center gap-3">
                  <button className="w-10 h-10 rounded-xl bg-dark-100 flex items-center justify-center text-dark-500 hover:text-dark-900 transition-colors">
                    <Image className="w-5 h-5" />
                  </button>
                  <button className="w-10 h-10 rounded-xl bg-dark-100 flex items-center justify-center text-dark-500 hover:text-dark-900 transition-colors">
                    <Smile className="w-5 h-5" />
                  </button>
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="输入消息..."
                      className="w-full px-4 py-3 bg-white border border-dark-300 rounded-xl text-dark-900 placeholder-dark-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15"
                    />
                  </div>
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className="w-10 h-10 rounded-xl bg-primary-500 hover:bg-primary-600 flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-dark-500">
              <div className="text-center">
                <User className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p>选择一个好友开始聊天</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Friend Modal */}
      {showAddFriendModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-dark-300 w-full max-w-lg max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-dark-300">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-dark-900">添加好友</h3>
                <button
                  onClick={() => {
                    setShowAddFriendModal(false);
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="w-10 h-10 rounded-xl bg-dark-100 flex items-center justify-center text-dark-500 hover:text-dark-900 transition-colors"
                >
                  ×
                </button>
              </div>

              {/* Pending Requests */}
              {pendingRequests.length > 0 && (
                <div className="mt-4 space-y-3">
                  <div className="text-sm text-dark-500">待处理的好友请求</div>
                  {pendingRequests.map((req) => (
                    <div key={req.request_id} className="flex items-center gap-3 p-3 bg-dark-100 rounded-xl">
                      <img src={req.avatar} alt={req.nickname} className="w-10 h-10 rounded-full" />
                      <div className="flex-1">
                        <div className="font-medium text-dark-900">{req.nickname}</div>
                        <div className="text-xs text-dark-500">Lv.{req.level}</div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAcceptFriend(req.request_id)}
                          className="px-3 py-1.5 bg-primary-500 text-white rounded-lg text-sm"
                        >
                          接受
                        </button>
                        <button
                          onClick={() => handleRejectFriend(req.request_id)}
                          className="px-3 py-1.5 bg-dark-200 text-dark-700 rounded-lg text-sm"
                        >
                          拒绝
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Search */}
              <div className="mt-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchUsers()}
                    placeholder="搜索用户昵称或手机号..."
                    className="w-full pl-12 pr-4 py-3 bg-white border border-dark-300 rounded-xl text-dark-900 placeholder-dark-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15"
                  />
                </div>
              </div>
            </div>

            {/* Search Results */}
            <div className="flex-1 overflow-y-auto p-4">
              {searchResults.length === 0 ? (
                <div className="text-center text-dark-500 py-8">
                  <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>输入昵称或手机号搜索用户</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {searchResults.map((user) => (
                    <div key={user.id} className="flex items-center gap-3 p-3 bg-dark-100 rounded-xl">
                      <img src={user.avatar} alt={user.nickname} className="w-10 h-10 rounded-full" />
                      <div className="flex-1">
                        <div className="font-medium text-dark-900">{user.nickname}</div>
                        <div className="text-xs text-dark-500">Lv.{user.level}</div>
                      </div>
                      <button
                        onClick={() => handleSendFriendRequest(user.id)}
                        className="px-4 py-2 bg-primary-50 text-primary-700 rounded-lg text-sm hover:bg-primary-100 transition-colors"
                      >
                        添加好友
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;