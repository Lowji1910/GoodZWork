import { useState, useEffect } from 'react'
import { chatAPI } from '../api'
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

    useEffect(() => {
        loadConversations()
    }, [])

    // Listen for new messages
    useEffect(() => {
        if (!socket) return

        const handleNewMessage = (message) => {
            if (message.conversation_id === selectedConv?.id) {
                setMessages(prev => [...prev, message])
                // Mark as seen
                markSeen(message.conversation_id, [message.id])
            }

            // Update conversation list
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

            // Mark all as seen
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

    const handleSendMessage = (content) => {
        if (!selectedConv) return
        sendMessage({
            conversation_id: selectedConv.id,
            content,
            message_type: 'text'
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
                <div className="p-4 border-b border-slate-700">
                    <h2 className="text-lg font-semibold">💬 Tin nhắn</h2>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {conversations.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                            <p>Chưa có cuộc trò chuyện nào</p>
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
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                                        {conv.avatar ? (
                                            <img src={conv.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                                        ) : (
                                            conv.name?.[0] || '?'
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
        </div>
    )
}
