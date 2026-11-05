import React from 'react';
import { Outlet } from 'react-router-dom';

const AuthLayout = () => {
  return (
    <div className="w-100 min-vh-100 p-0 m-0 overflow-x-hidden">
      <Outlet />
    </div>
  );
};

export default AuthLayout;
