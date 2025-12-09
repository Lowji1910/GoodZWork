import { useState, useEffect, useRef } from 'react'
import { useSocket } from '../context/SocketContext'
import { useAuth } from '../context/AuthContext'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

export default function ChatWindow({
    conversation,
    messages,
    onSendMessage,
    onLoadMore,
    loading
}) {
    const { user } = useAuth()
    const { sendTyping, revokeMessage, typingUsers } = useSocket()
    const [newMessage, setNewMessage] = useState('')
    const [showContextMenu, setShowContextMenu] = useState(null)
    const messagesEndRef = useRef(null)
    const inputRef = useRef(null)
    const typingTimeoutRef = useRef(null)

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    // Handle typing indicator
    const handleInputChange = (e) => {
        setNewMessage(e.target.value)

        // Send typing indicator
        if (conversation) {
            sendTyping(conversation.id, true)

            // Clear previous timeout
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current)
            }

            // Stop typing after 2 seconds of no input
            typingTimeoutRef.current = setTimeout(() => {
                sendTyping(conversation.id, false)
            }, 2000)
        }
    }

    const handleSend = () => {
        if (newMessage.trim() && conversation) {
            onSendMessage(newMessage.trim())
            setNewMessage('')
            sendTyping(conversation.id, false)
            inputRef.current?.focus()
        }
    }

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    const handleRevoke = (messageId) => {
        revokeMessage(messageId)
        setShowContextMenu(null)
    }

    const renderMessageStatus = (message) => {
        if (message.is_revoked) return null
        if (message.sender_id !== user.id) return null

        let icon = '⏳' // Sending
        let color = 'text-slate-400'

        if (message.seen_by?.length > 0) {
            icon = '✓✓'
            color = 'tick-seen'
        } else if (message.status === 'DELIVERED') {
            icon = '✓✓'
            color = 'tick-delivered'
        } else if (message.status === 'SENT') {
            icon = '✓'
            color = 'tick-sent'
        }

        return <span className={`text-xs ${color}`}>{icon}</span>
    }

    const typingUser = typingUsers[conversation?.id]

    if (!conversation) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-slate-400">
                    <p className="text-4xl mb-4">💬</p>
                    <p>Chọn một cuộc trò chuyện để bắt đầu</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex-1 flex flex-col h-full">
            {/* Header */}
            <div className="glass-card p-4 flex items-center gap-3 rounded-none border-b border-slate-700/50">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                    {conversation.avatar ? (
                        <img src={conversation.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                        conversation.name?.[0] || '?'
                    )}
                </div>
                <div className="flex-1">
                    <h3 className="font-semibold">{conversation.name}</h3>
                    <p className="text-xs text-slate-400">
                        {conversation.type === 'GROUP'
                            ? `${conversation.participants?.length || 0} thành viên`
                            : 'Tin nhắn riêng'}
                    </p>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loading && (
                    <div className="text-center">
                        <div className="spinner mx-auto"></div>
                    </div>
                )}

                {messages.map((msg, index) => {
                    const isOwn = msg.sender_id === user.id
                    const showAvatar = !isOwn && (index === 0 || messages[index - 1]?.sender_id !== msg.sender_id)

                    return (
                        <div
                            key={msg.id}
                            className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group`}
                        >
                            {!isOwn && showAvatar && (
                                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-teal-500 flex items-center justify-center text-white text-sm font-bold mr-2 flex-shrink-0">
                                    {msg.sender_avatar ? (
                                        <img src={msg.sender_avatar} alt="" className="w-full h-full rounded-full object-cover" />
                                    ) : (
                                        msg.sender_name?.[0] || '?'
                                    )}
                                </div>
                            )}
                            {!isOwn && !showAvatar && <div className="w-8 mr-2" />}

                            <div
                                className={`relative max-w-xs md:max-w-md lg:max-w-lg ${isOwn
                                        ? 'bg-gradient-to-r from-blue-600 to-purple-600'
                                        : 'bg-slate-700'
                                    } rounded-2xl px-4 py-2 ${msg.is_revoked ? 'opacity-50 italic' : ''
                                    }`}
                                onContextMenu={(e) => {
                                    if (isOwn && !msg.is_revoked) {
                                        e.preventDefault()
                                        setShowContextMenu(msg.id)
                                    }
                                }}
                            >
                                {!isOwn && showAvatar && (
                                    <p className="text-xs text-slate-400 mb-1">{msg.sender_name}</p>
                                )}

                                {msg.is_revoked ? (
                                    <p className="text-sm text-slate-300">Tin nhắn đã được thu hồi</p>
                                ) : (
                                    <>
                                        {msg.message_type === 'image' && msg.file_url && (
                                            <img
                                                src={msg.file_url}
                                                alt=""
                                                className="rounded-lg max-w-full mb-2 cursor-pointer hover:opacity-90"
                                                onClick={() => window.open(msg.file_url, '_blank')}
                                            />
                                        )}
                                        {msg.message_type === 'file' && msg.file_url && (
                                            <a
                                                href={msg.file_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 text-blue-300 hover:underline mb-2"
                                            >
                                                📎 {msg.file_name}
                                            </a>
                                        )}
                                        <p className="text-sm break-words">{msg.content}</p>
                                    </>
                                )}

                                <div className="flex items-center justify-end gap-2 mt-1">
                                    <span className="text-xs text-slate-400">
                                        {format(new Date(msg.created_at), 'HH:mm', { locale: vi })}
                                    </span>
                                    {renderMessageStatus(msg)}
                                </div>

                                {/* Context Menu */}
                                {showContextMenu === msg.id && (
                                    <div
                                        className="absolute right-0 top-full mt-1 bg-slate-800 rounded-lg shadow-xl border border-slate-600 py-1 z-10"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <button
                                            onClick={() => handleRevoke(msg.id)}
                                            className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-slate-700"
                                        >
                                            🗑️ Thu hồi tin nhắn
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}

                {/* Typing Indicator */}
                {typingUser && (
                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                        <div className="flex gap-1">
                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span>{typingUser} đang nhập...</span>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="glass-card p-4 rounded-none border-t border-slate-700/50">
                <div className="flex items-center gap-3">
                    <button className="text-2xl hover:scale-110 transition-transform">
                        📎
                    </button>
                    <input
                        ref={inputRef}
                        type="text"
                        value={newMessage}
                        onChange={handleInputChange}
                        onKeyPress={handleKeyPress}
                        placeholder="Nhập tin nhắn..."
                        className="flex-1 bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!newMessage.trim()}
                        className="btn-primary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Gửi
                    </button>
                </div>
            </div>

            {/* Close context menu on click outside */}
            {showContextMenu && (
                <div
                    className="fixed inset-0 z-0"
                    onClick={() => setShowContextMenu(null)}
                />
            )}
        </div>
    )
}
