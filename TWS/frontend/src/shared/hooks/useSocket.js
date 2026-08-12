import { API_BASE_URL } from '../../constants/apiEndpoints';
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

const useSocket = () => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // SECURITY FIX: Socket.io authentication should use cookies or a different method
    // For now, we'll connect without token in auth - backend should verify via cookies
    // Note: Socket.io may need backend changes to support cookie-based auth
    const socketUrl = API_BASE_URL;
    const newSocket = io(socketUrl, {
      withCredentials: true, // SECURITY FIX: Include cookies
      // SECURITY FIX: Removed token from auth - backend should verify via cookies
    });

    newSocket.on('connect', () => {
      console.log('Connected to server');
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    setSocket(newSocket);

    return () => {
      newSocket.removeAllListeners();
      newSocket.close();
    };
  }, []);

  return socket;
};

export { useSocket };
export default useSocket;
