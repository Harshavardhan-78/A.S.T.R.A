import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/common/Header';
import Sidebar from '../components/common/Sidebar';

const AppLayout = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-[#020617] text-slate-100">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 animate-fade-in">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
