import React from 'react';

const InstantLoader = ({ type = 'table', rows = 5 }) => {
  if (type === 'table') {
    return (
      <div className="animate-pulse">
        <div className="bg-gray-200 h-8 rounded mb-4"></div>
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex space-x-4 mb-3">
            <div className="bg-gray-200 h-6 w-20 rounded"></div>
            <div className="bg-gray-200 h-6 w-32 rounded"></div>
            <div className="bg-gray-200 h-6 w-48 rounded"></div>
            <div className="bg-gray-200 h-6 w-24 rounded"></div>
            <div className="bg-gray-200 h-6 w-16 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'cards') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="animate-pulse bg-white p-6 rounded-lg shadow">
            <div className="bg-gray-200 h-6 w-3/4 rounded mb-3"></div>
            <div className="bg-gray-200 h-4 w-1/2 rounded mb-2"></div>
            <div className="bg-gray-200 h-4 w-2/3 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'dashboard') {
    return (
      <div className="animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="bg-white rounded-lg shadow-md p-6">
              <div className="bg-gray-200 h-12 w-12 rounded-full mb-4"></div>
              <div className="bg-gray-200 h-4 w-20 rounded mb-2"></div>
              <div className="bg-gray-200 h-8 w-16 rounded"></div>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="bg-gray-200 h-6 w-48 rounded mb-4"></div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="bg-gray-200 h-4 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-pulse">
      <div className="bg-gray-200 h-8 rounded mb-4"></div>
      <div className="bg-gray-200 h-64 rounded"></div>
    </div>
  );
};

export default InstantLoader;