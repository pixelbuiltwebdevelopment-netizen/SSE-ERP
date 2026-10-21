import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { fetchCurrentUser, resetAuthState } from './store/slices/authSlice';
import { getAccessToken } from './api/axiosClient';
import AppRoutes from './routes/AppRoutes';
import { SocketProvider } from './components/providers/SocketProvider';

const App = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    // Tab isolation check: Only verify session if this specific tab has an access token in sessionStorage
    const token = getAccessToken();
    if (token) {
      dispatch(fetchCurrentUser());
    } else {
      dispatch(resetAuthState());
    }
  }, [dispatch]);

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <SocketProvider>
        <AppRoutes />
      </SocketProvider>
    </BrowserRouter>
  );
};

export default App;
