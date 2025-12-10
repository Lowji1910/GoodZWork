import { useState, useEffect } from 'react'
import { chatAPI, userAPI } from '../api'
import { useSocket } from '../context/SocketContext'
import { useAuth } from '../context/AuthContext'
import ChatWindow from '../components/ChatWindow'
import { format } from 'date-fns'

export default function ChatPage() {
    const { user } = useAuth()
    const { socket, sendMessage, joinConversation, markSeen } = useSocket()
    const [conversations, setConversations] = useState([])
    const [selectedConv, setSelectedConv] = useState(null)
    const [messages, setMessages] = useState([])
    const [loading, setLoading] = useState(true)
    const [msgLoading, setMsgLoading] = useState(false)
    const [showNewChatModal, setShowNewChatModal] = useState(false)

    useEffect(() => {
        loadConversations()
    }, [])

    // Listen for new messages
    useEffect(() => {
        if (!socket) return

        const handleNewMessage = (message) => {
            if (message.conversation_id === selectedConv?.id) {
                setMessages(prev => [...prev, message])
                markSeen(message.conversation_id, [message.id])
            }
            loadConversations()
        }

        const handleMessageRevoked = ({ message_id, conversation_id }) => {
            if (conversation_id === selectedConv?.id) {
                setMessages(prev => prev.map(msg =>
                    msg.id === message_id ? { ...msg, is_revoked: true } : msg
                ))
            }
        }

        const handleMessagesSeen = ({ message_ids, seen_by }) => {
            setMessages(prev => prev.map(msg =>
                message_ids.includes(msg.id)
                    ? { ...msg, status: 'SEEN', seen_by: [...(msg.seen_by || []), seen_by] }
                    : msg
            ))
        }

        socket.on('new_message', handleNewMessage)
        socket.on('message_revoked', handleMessageRevoked)
        socket.on('messages_seen', handleMessagesSeen)

        return () => {
            socket.off('new_message', handleNewMessage)
            socket.off('message_revoked', handleMessageRevoked)
            socket.off('messages_seen', handleMessagesSeen)
        }
    }, [socket, selectedConv])

    const loadConversations = async () => {
        try {
            const response = await chatAPI.getConversations()
            setConversations(response.data)
        } catch (error) {
            console.error('Failed to load conversations:', error)
        } finally {
            setLoading(false)
        }
    }

    const loadMessages = async (conversationId) => {
        setMsgLoading(true)
        try {
            const response = await chatAPI.getMessages(conversationId)
            setMessages(response.data)

            const unreadIds = response.data
                .filter(msg => msg.sender_id !== user.id && !msg.seen_by?.includes(user.id))
                .map(msg => msg.id)
            if (unreadIds.length > 0) {
                markSeen(conversationId, unreadIds)
            }
        } catch (error) {
            console.error('Failed to load messages:', error)
        } finally {
            setMsgLoading(false)
        }
    }

    const handleSelectConversation = (conv) => {
        setSelectedConv(conv)
        joinConversation(conv.id)
        loadMessages(conv.id)
    }

    const handleSendMessage = (content, type = 'text', fileUrl = null, fileName = null, replyToId = null) => {
        if (!selectedConv) return
        sendMessage({
            conversation_id: selectedConv.id,
            content,
            message_type: type,
            file_url: fileUrl,
            file_name: fileName,
            reply_to_id: replyToId
        })
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="spinner"></div>
            </div>
        )
    }

    return (
        <div className="flex h-[calc(100vh-2rem)] gap-4">
            {/* Conversation List */}
            <div className="w-80 glass-card flex flex-col">
                <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                    <h2 className="text-lg font-semibold">💬 Tin nhắn</h2>
                    <button
                        onClick={() => setShowNewChatModal(true)}
                        className="bg-blue-600 hover:bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors"
                        title="Tạo tin nhắn mới"
                    >
                        +
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {conversations.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                            <p>Chưa có cuộc trò chuyện nào</p>
                            <button
                                onClick={() => setShowNewChatModal(true)}
                                className="text-blue-400 hover:underline mt-2 text-sm"
                            >
                                Bắt đầu ngay
                            </button>
                        </div>
                    ) : (
                        conversations.map(conv => (
                            <div
                                key={conv.id}
                                onClick={() => handleSelectConversation(conv)}
                                className={`p-4 cursor-pointer transition-colors border-b border-slate-700/50 ${selectedConv?.id === conv.id
                                    ? 'bg-blue-500/20'
                                    : 'hover:bg-slate-700/30'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${conv.type === 'GROUP' ? 'bg-indigo-600' : 'bg-gradient-to-r from-blue-500 to-purple-500'
                                        }`}>
                                        {conv.avatar ? (
                                            <img src={conv.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                                        ) : (
                                            conv.name?.[0] || (conv.type === 'GROUP' ? 'G' : '?')
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <p className="font-medium truncate">{conv.name}</p>
                                            {conv.last_message_at && (
                                                <span className="text-xs text-slate-400">
                                                    {format(new Date(conv.last_message_at), 'HH:mm')}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-400 truncate">
                                            {conv.last_message || 'Bắt đầu cuộc trò chuyện'}
                                        </p>
                                    </div>
                                    {conv.unread_count > 0 && (
                                        <span className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-xs">
                                            {conv.unread_count}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Chat Window */}
            <div className="flex-1 glass-card flex flex-col overflow-hidden">
                <ChatWindow
                    conversation={selectedConv}
                    messages={messages}
                    onSendMessage={handleSendMessage}
                    loading={msgLoading}
                />
            </div>

            {/* New Chat Modal */}
            {showNewChatModal && (
                <NewChatModal
                    onClose={() => setShowNewChatModal(false)}
                    onSuccess={(newConv) => {
                        setShowNewChatModal(false)
                        loadConversations()
                        handleSelectConversation(newConv) // Auto select
                    }}
                />
            )}
        </div>
    )
}

function NewChatModal({ onClose, onSuccess }) {
    const [searchTerm, setSearchTerm] = useState('')
    const [searchResults, setSearchResults] = useState([])
    const [selectedUsers, setSelectedUsers] = useState([])
    const [groupName, setGroupName] = useState('')
    const [loading, setLoading] = useState(false)
    const { user: currentUser } = useAuth()

    const handleSearch = async (term) => {
        setSearchTerm(term)
        if (term.length < 2) {
            setSearchResults([])
            return
        }

        try {
            const res = await userAPI.searchUsers(term)
            setSearchResults(res.data)
        } catch (error) {
            console.error(error)
        }
    }

    const toggleUser = (user) => {
        if (selectedUsers.find(u => u.id === user.id)) {
            setSelectedUsers(prev => prev.filter(u => u.id !== user.id))
        } else {
            setSelectedUsers(prev => [...prev, user])
        }
    }

    const handleCreate = async () => {
        if (selectedUsers.length === 0) return

        setLoading(true)
        try {
            const isGroup = selectedUsers.length > 1
            const type = isGroup ? 'GROUP' : 'PRIVATE'
            const name = isGroup ? groupName || selectedUsers.map(u => u.full_name).join(', ') : null
            const participants = selectedUsers.map(u => u.id)

            const res = await chatAPI.createConversation(type, name, participants)

            // Need to construct a temp conversation object to select it immediately
            const newConv = {
                id: res.data.id,
                type,
                name: name || selectedUsers[0].full_name, // For private chat fallback name
                avatar: isGroup ? null : selectedUsers[0].avatar, // For private chat fallback avatar
                participants: [currentUser.id, ...participants],
            }
            onSuccess(newConv)
        } catch (error) {
            console.error('Create failed', error)
            alert(error.response?.data?.detail || 'Tạo thất bại')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="glass-card w-full max-w-md p-6 animate-fade-in">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">Tạo tin nhắn mới</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
                </div>

                <div className="space-y-4">
                    {/* Search Input */}
                    <div>
                        <input
                            type="text"
                            placeholder="Tìm kiếm nhân viên (Tên, Email)..."
                            value={searchTerm}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="input-field w-full"
                        />
                    </div>

                    {/* Selected Users */}
                    {selectedUsers.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {selectedUsers.map(u => (
                                <div key={u.id} className="bg-blue-600 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                                    <span>{u.full_name}</span>
                                    <button onClick={() => toggleUser(u)} className="hover:text-red-300">×</button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Group Name (if > 1 user) */}
                    {selectedUsers.length > 1 && (
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Tên nhóm</label>
                            <input
                                type="text"
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                                placeholder="Nhập tên nhóm..."
                                className="input-field w-full"
                            />
                        </div>
                    )}

                    {/* Search Results */}
                    <div className="max-h-60 overflow-y-auto border border-slate-700/50 rounded-xl">
                        {searchResults.length === 0 && searchTerm.length >= 2 && (
                            <p className="text-center text-slate-400 py-4">Không tìm thấy ai</p>
                        )}
                        {searchResults.map(user => {
                            const isSelected = selectedUsers.some(u => u.id === user.id)
                            return (
                                <div
                                    key={user.id}
                                    onClick={() => toggleUser(user)}
                                    className={`p-3 flex items-center gap-3 cursor-pointer hover:bg-slate-700/50 ${isSelected ? 'bg-blue-900/30' : ''}`}
                                >
                                    <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center font-bold">
                                        {user.avatar ? <img src={user.avatar} className="w-full h-full rounded-full object-cover" /> : user.full_name[0]}
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">{user.full_name}</p>
                                        <p className="text-xs text-slate-400">{user.department} - {user.position}</p>
                                    </div>
                                    {isSelected && <span className="ml-auto text-blue-400">✓</span>}
                                </div>
                            )
                        })}
                    </div>

                    <button
                        onClick={handleCreate}
                        disabled={selectedUsers.length === 0 || loading}
                        className="btn-primary w-full disabled:opacity-50"
                    >
                        {loading ? 'Đang tạo...' : `Bắt đầu trò chuyện (${selectedUsers.length})`}
                    </button>
                </div>
            </div>
        </div>
    )
}
