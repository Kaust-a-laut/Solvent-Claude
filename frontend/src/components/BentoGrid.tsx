import React from 'react';

export const BentoGrid = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
    {children}
  </div>
);

export const BentoItem = ({ children, title }: { children: React.ReactNode, title?: string }) => (
  <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 shadow-xl">
    {title && <h3 className="text-lg font-semibold mb-2">{title}</h3>}
    {children}
  </div>
);
