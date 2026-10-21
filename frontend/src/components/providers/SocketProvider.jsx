import React, { createContext, useContext, useEffect, useState } from 'react';
import { socketService } from '../../services/socketService';
import { useAuth } from '../../hooks/useAuth';

const SocketContext = createContext(null);

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      socketService.connect();
      setSocket(socketService.getSocket());
    } else {
      socketService.disconnect();
      setSocket(null);
    }

    return () => {
      socketService.disconnect();
    };
  }, [isAuthenticated]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
