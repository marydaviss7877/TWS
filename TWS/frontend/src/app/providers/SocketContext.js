import { API_BASE_URL } from '../../constants/apiEndpoints';
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [connectionState, setConnectionState] = useState('disconnected');
  const { user, token } = useAuth();
  
  // Reconnection configuration
  const maxReconnectAttempts = 10;
  const baseReconnectDelay = 1000; // 1 second
  const maxReconnectDelay = 30000; // 30 seconds

  // Calculate exponential backoff delay
  const getReconnectDelay = useCallback((attempt) => {
    const delay = Math.min(
      baseReconnectDelay * Math.pow(2, attempt),
      maxReconnectDelay
    );
    // Add jitter to prevent thundering herd
    return delay + Math.random() * 1000;
  }, [baseReconnectDelay, maxReconnectDelay]);

  // Reconnection logic
  const attemptReconnect = useCallback(() => {
    if (reconnectAttempts >= maxReconnectAttempts) {
      setConnectionState('failed');
      setConnectionError('Max reconnection attempts reached');
      return;
    }

    setConnectionState('reconnecting');
    const delay = getReconnectDelay(reconnectAttempts);
    
    setTimeout(() => {
      if (socket && !socket.connected) {
        setReconnectAttempts(prev => prev + 1);
        socket.connect();
      }
    }, delay);
  }, [reconnectAttempts, maxReconnectAttempts, getReconnectDelay, socket]);

  useEffect(() => {
    if (user && token) {
      const socketUrl = API_BASE_URL;
      const newSocket = io(socketUrl, {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true,
        reconnection: false, // We'll handle reconnection manually
        reconnectionAttempts: 0,
        reconnectionDelay: 0
      });

      newSocket.on('connect', () => {
        console.log('Socket connected:', newSocket.id);
        setIsConnected(true);
        setConnectionError(null);
        setConnectionState('connected');
        setReconnectAttempts(0);
      });

      newSocket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        setIsConnected(false);
        setConnectionState('disconnected');
        
        // Only attempt reconnection for certain disconnect reasons
        if (reason === 'io server disconnect') {
          // Server initiated disconnect, don't reconnect
          setConnectionState('disconnected');
        } else {
          // Client-side disconnect or network issues, attempt reconnection
          attemptReconnect();
        }
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setConnectionError(error.message);
        setIsConnected(false);
        setConnectionState('error');
        attemptReconnect();
      });

      newSocket.on('reconnect', (attemptNumber) => {
        console.log('Socket reconnected after', attemptNumber, 'attempts');
        setConnectionState('connected');
        setReconnectAttempts(0);
      });

      newSocket.on('reconnect_attempt', (attemptNumber) => {
        console.log('Reconnection attempt:', attemptNumber);
        setConnectionState('reconnecting');
        setReconnectAttempts(attemptNumber);
      });

      newSocket.on('reconnect_error', (error) => {
        console.error('Reconnection error:', error);
        setConnectionError(error.message);
      });

      newSocket.on('reconnect_failed', () => {
        console.error('Reconnection failed');
        setConnectionState('failed');
        setConnectionError('Failed to reconnect to server');
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    } else {
      // Clean up socket when user or token is not available
      if (socket) {
        socket.close();
        setSocket(null);
        setIsConnected(false);
        setConnectionState('disconnected');
      }
    }
  }, [user?.id, token]); // Use user.id instead of user object to prevent unnecessary re-renders

  const joinChat = (chatId) => {
    if (socket && isConnected) {
      socket.emit('join-chat', chatId);
    }
  };

  const leaveChat = (chatId) => {
    if (socket && isConnected) {
      socket.emit('leave-chat', chatId);
    }
  };

  const sendMessage = (messageData) => {
    if (socket && isConnected) {
      socket.emit('send-message', messageData);
    }
  };

  const startTyping = (chatId) => {
    if (socket && isConnected) {
      socket.emit('typing-start', { chatId });
    }
  };

  const stopTyping = (chatId) => {
    if (socket && isConnected) {
      socket.emit('typing-stop', { chatId });
    }
  };

  const addReaction = (messageId, emoji) => {
    if (socket && isConnected) {
      socket.emit('message-reaction', { messageId, emoji, action: 'add' });
    }
  };

  const removeReaction = (messageId, emoji) => {
    if (socket && isConnected) {
      socket.emit('message-reaction', { messageId, emoji, action: 'remove' });
    }
  };

  const markMessageAsRead = (messageId) => {
    if (socket && isConnected) {
      socket.emit('message-read', { messageId });
    }
  };

  // Manual reconnection function
  const reconnect = useCallback(() => {
    if (socket && !socket.connected) {
      setReconnectAttempts(0);
      setConnectionState('reconnecting');
      socket.connect();
    }
  }, [socket]);

  const value = {
    socket,
    isConnected,
    connectionError,
    connectionState,
    reconnectAttempts,
    reconnect,
    joinChat,
    leaveChat,
    sendMessage,
    startTyping,
    stopTyping,
    addReaction,
    removeReaction,
    markMessageAsRead
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};