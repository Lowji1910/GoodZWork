import { useState, useEffect, useRef } from 'react'
import { useSocket } from '../context/SocketContext'
import { useAuth } from '../context/AuthContext'
import { chatAPI } from '../api'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

export default function ChatWindow({
    conversation,
    messages,
    onSendMessage,
    loading
}) {
    const { user } = useAuth()
    const { sendTyping, revokeMessage, typingUsers } = useSocket()
    const [newMessage, setNewMessage] = useState('')
    const [showContextMenu, setShowContextMenu] = useState(null)
    const messagesEndRef = useRef(null)
    const inputRef = useRef(null)
    const fileInputRef = useRef(null)
    const typingTimeoutRef = useRef(null)
    const [replyTo, setReplyTo] = useState(null)

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
            onSendMessage(newMessage.trim(), 'text', null, null, replyTo?.id)
            setNewMessage('')
            setReplyTo(null)
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

    const uploadAndSend = async (file) => {
        try {
            const response = await chatAPI.uploadFile(file)
            const data = response.data

            const content = data.type === 'image' ? 'Đã gửi một ảnh' : `Đã gửi tệp: ${data.filename}`
            onSendMessage(content, data.type, data.url, data.filename, replyTo?.id)
            setReplyTo(null)
        } catch (error) {
            console.error('File upload failed', error)
            alert('Upload thất bại')
        }
    }

    const handleFileSelect = async (e) => {
        const file = e.target.files[0]
        if (!file) return
        await uploadAndSend(file)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const handlePaste = async (e) => {
        const items = e.clipboardData?.items
        if (!items) return

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile()
                if (file) {
                    e.preventDefault()
                    await uploadAndSend(file)
                }
            }
        }
    }

    const handleReply = (msg) => {
        setReplyTo(msg)
        inputRef.current?.focus()
        setShowContextMenu(null)
    }

    const handleRevoke = (messageId) => {
        revokeMessage(messageId)
        setShowContextMenu(null)
    }

    const renderMessageStatus = (message) => {
        if (message.is_revoked) return null
        if (message.sender_id !== user.id) return null

        let text = 'Đang gửi'
        let color = 'text-slate-400'

        if (message.seen_by?.length > 0) {
            text = 'Đã xem'
            color = 'text-blue-400'
        } else if (message.status === 'DELIVERED') {
            text = 'Đã nhận'
            color = 'text-green-400'
        } else if (message.status === 'SENT') {
            text = 'Đã gửi'
            color = 'text-slate-300'
        } else if (message.status === 'SENDING') {
            text = 'Đang gửi'
            color = 'text-slate-400'
        } else if (message.status === 'ERROR') {
            text = 'Lỗi'
            color = 'text-red-500'
        }

        return <span className={`text-[10px] ${color} ml-1 min-w-[40px] text-right`}>{text}</span>
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
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                    {conversation.avatar ? (
                        <img src={conversation.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                        conversation.name?.[0] || '?'
                    )}
                </div>
                <div className="flex-1">
                    <h3 className="font-semibold text-lg">{conversation.name}</h3>
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
                            className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group mb-1`}
                        >
                            {!isOwn && showAvatar && (
                                <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0 border border-slate-500">
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
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-700 text-slate-200'
                                    } rounded-2xl px-4 py-2 ${msg.is_revoked ? 'opacity-50 italic border border-slate-600 bg-transparent' : 'shadow-md'
                                    }`}
                                onContextMenu={(e) => {
                                    if (!msg.is_revoked) {
                                        e.preventDefault()
                                        setShowContextMenu(msg.id)
                                    }
                                }}
                            >
                                {!isOwn && showAvatar && (
                                    <p className="text-[10px] text-slate-400 mb-1 font-bold">{msg.sender_name}</p>
                                )}

                                {msg.reply_to && (
                                    <div className="mb-2 p-2 rounded bg-black/20 text-sm border-l-2 border-blue-500 cursor-pointer hover:bg-black/30 transition-colors">
                                        <p className="font-bold text-[10px] opacity-70 mb-0.5">{msg.reply_to.sender_name}</p>
                                        <p className="truncate opacity-50 text-xs">{msg.reply_to.content || (msg.reply_to.message_type === 'image' ? '📷 Ảnh' : '📁 Tệp tin')}</p>
                                    </div>
                                )}

                                {msg.is_revoked ? (
                                    <p className="text-sm">Tin nhắn đã được thu hồi</p>
                                ) : (
                                    <>
                                        {msg.message_type === 'image' && msg.file_url && (
                                            <div className="mb-2">
                                                <img
                                                    src={msg.file_url}
                                                    alt="Attached"
                                                    className="rounded-lg max-w-full max-h-60 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                                                    onClick={() => window.open(msg.file_url, '_blank')}
                                                />
                                            </div>
                                        )}
                                        {msg.message_type === 'file' && msg.file_url && (
                                            <a
                                                href={msg.file_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 p-2 bg-black/20 rounded-lg hover:bg-black/30 transition-colors mb-1"
                                            >
                                                <span className="text-2xl">📄</span>
                                                <span className="text-sm underline truncate max-w-[200px]">{msg.file_name || 'Tệp đính kèm'}</span>
                                            </a>
                                        )}
                                        {msg.content && msg.message_type === 'text' && (
                                            <p className="text-sm break-words whitespace-pre-wrap">{msg.content}</p>
                                        )}
                                        {/* Show content for file/image types if it exists (usually just description) */}
                                        {msg.message_type !== 'text' && msg.content && (
                                            <p className="text-xs mt-1 text-slate-300">{msg.content}</p>
                                        )}
                                    </>
                                )}

                                <div className="flex items-center justify-end gap-1 mt-1 opacity-70">
                                    <span className="text-[10px]">
                                        {msg.created_at ? format(new Date(msg.created_at), 'HH:mm', { locale: vi }) : '...'}
                                    </span>
                                    {renderMessageStatus(msg)}
                                </div>

                                {/* Context Menu */}
                                {showContextMenu === msg.id && (
                                    <div
                                        className="absolute right-0 top-full mt-1 bg-slate-800 rounded-lg shadow-xl border border-slate-600 py-1 z-20 overflow-hidden min-w-[150px]"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <button
                                            onClick={() => handleReply(msg)}
                                            className="w-full px-4 py-3 text-left text-sm text-blue-400 hover:bg-slate-700 flex items-center gap-2 transition-colors border-b border-slate-700"
                                        >
                                            ↩️ Trả lời
                                        </button>
                                        {isOwn && (
                                            <button
                                                onClick={() => handleRevoke(msg.id)}
                                                className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-slate-700 flex items-center gap-2 transition-colors"
                                            >
                                                🗑️ Thu hồi
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}

                {/* Typing Indicator */}
                {typingUser && (
                    <div className="flex items-center gap-2 text-slate-400 text-xs ml-10 animate-fade-in">
                        <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span>{typingUser} đang nhập...</span>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="glass-card rounded-none border-t border-slate-700/50 flex flex-col">
                {replyTo && (
                    <div className="bg-slate-800/80 p-3 flex justify-between items-center text-sm border-b border-slate-700 backdrop-blur-sm animate-fade-in-up">
                        <div className="flex-1 overflow-hidden">
                            <span className="font-bold text-blue-400 text-xs block mb-1">Đang trả lời {replyTo.sender_name}</span>
                            <p className="truncate text-slate-300 max-w-md">{replyTo.content || (replyTo.message_type === 'image' ? '📷 Ảnh' : '📁 Tệp tin')}</p>
                        </div>
                        <button
                            onClick={() => setReplyTo(null)}
                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                        >
                            ✕
                        </button>
                    </div>
                )}
                <div className="p-4 flex items-center gap-3">
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileSelect}
                    />
                    <button
                        className="text-2xl text-slate-400 hover:text-white hover:scale-110 transition-transform p-2"
                        onClick={() => fileInputRef.current?.click()}
                        title="Đính kèm file/ảnh/video"
                    >
                        📎
                    </button>
                    <input
                        ref={inputRef}
                        type="text"
                        value={newMessage}
                        onChange={handleInputChange}
                        onKeyPress={handleKeyPress}
                        onPaste={handlePaste}
                        placeholder="Nhập tin nhắn..."
                        className="flex-1 bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!newMessage.trim()}
                        className="btn-primary px-6 py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg hover:shadow-blue-500/20"
                    >
                        Gửi
                    </button>
                </div>
            </div>

            {/* Close context menu on click outside */}
            {showContextMenu && (
                <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowContextMenu(null)}
                />
            )}
        </div>
    )
}
