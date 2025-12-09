import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'

const SocketContext = createContext(null)

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:8000'

export function SocketProvider({ children }) {
    const { user, isAuthenticated } = useAuth()
    const [socket, setSocket] = useState(null)
    const [connected, setConnected] = useState(false)
    const [typingUsers, setTypingUsers] = useState({})

    // Connect socket when authenticated
    useEffect(() => {
        if (isAuthenticated && user) {
            const newSocket = io(SOCKET_URL, {
                path: '/socket.io',
                auth: {
                    user_id: user.id,
                    user_name: user.full_name
                },
                transports: ['websocket', 'polling']
            })

            newSocket.on('connect', () => {
                console.log('Socket connected:', newSocket.id)
                setConnected(true)
            })

            newSocket.on('disconnect', () => {
                console.log('Socket disconnected')
                setConnected(false)
            })

            newSocket.on('connect_error', (error) => {
                console.error('Socket connection error:', error)
            })

            // Handle typing events
            newSocket.on('user_typing', (data) => {
                setTypingUsers(prev => ({
                    ...prev,
                    [data.conversation_id]: data.is_typing ? data.user_name : null
                }))

                // Clear typing after 3 seconds
                if (data.is_typing) {
                    setTimeout(() => {
                        setTypingUsers(prev => ({
                            ...prev,
                            [data.conversation_id]: null
                        }))
                    }, 3000)
                }
            })

            setSocket(newSocket)

            return () => {
                newSocket.close()
            }
        }
    }, [isAuthenticated, user])

    // Send message
    const sendMessage = useCallback((messageData) => {
        if (socket && connected) {
            socket.emit('send_message', {
                ...messageData,
                sender_id: user.id,
                sender_name: user.full_name,
                sender_avatar: user.avatar
            })
        }
    }, [socket, connected, user])

    // Join conversation room
    const joinConversation = useCallback((conversationId) => {
        if (socket && connected) {
            socket.emit('join_conversation', { conversation_id: conversationId })
        }
    }, [socket, connected])

    // Leave conversation room
    const leaveConversation = useCallback((conversationId) => {
        if (socket && connected) {
            socket.emit('leave_conversation', { conversation_id: conversationId })
        }
    }, [socket, connected])

    // Mark messages as seen
    const markSeen = useCallback((conversationId, messageIds) => {
        if (socket && connected) {
            socket.emit('mark_seen', {
                conversation_id: conversationId,
                message_ids: messageIds,
                user_id: user.id
            })
        }
    }, [socket, connected, user])

    // Send typing indicator
    const sendTyping = useCallback((conversationId, isTyping) => {
        if (socket && connected) {
            socket.emit('typing', {
                conversation_id: conversationId,
                user_id: user.id,
                user_name: user.full_name,
                is_typing: isTyping
            })
        }
    }, [socket, connected, user])

    // Revoke message
    const revokeMessage = useCallback((messageId) => {
        if (socket && connected) {
            socket.emit('revoke_message', {
                message_id: messageId,
                user_id: user.id
            })
        }
    }, [socket, connected, user])

    // Message delivered
    const messageDelivered = useCallback((messageId) => {
        if (socket && connected) {
            socket.emit('message_delivered', {
                message_id: messageId,
                user_id: user.id
            })
        }
    }, [socket, connected, user])

    return (
        <SocketContext.Provider value={{
            socket,
            connected,
            typingUsers,
            sendMessage,
            joinConversation,
            leaveConversation,
            markSeen,
            sendTyping,
            revokeMessage,
            messageDelivered
        }}>
            {children}
        </SocketContext.Provider>
    )
}

export function useSocket() {
    const context = useContext(SocketContext)
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider')
    }
    return context
}
