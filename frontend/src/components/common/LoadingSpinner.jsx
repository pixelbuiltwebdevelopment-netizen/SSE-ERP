import React from 'react';

const LoadingSpinner = ({ 
  text = "LOADING", 
  subtext = "Authenticating ERP Session...",
  showRetry = false,
  onRetry = null
}) => {
  const segmentColors = [
    "#1e5385", "#266499", "#3378b2", "#408ec9",
    "#51a3dc", "#66b5e5", "#7ec3ec", "#99d1f2",
    "#b8dff7", "#d5edfb", "#ecf6fd", "#f6fbfe",
  ];

  return (
    <>
      <style>
        {`
          @keyframes erpSpinStep {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .erp-spinner-anim {
            animation: erpSpinStep 1s steps(12) infinite;
            transform-origin: center;
          }
        `}
      </style>

      <div 
        className="position-fixed top-0 start-0 w-100 vh-100 d-flex flex-column align-items-center justify-content-center bg-white"
        style={{ zIndex: 99999 }}
      >
        {/* Spinner Graphic */}
        <div style={{ width: '130px', height: '130px' }}>
          <svg 
            className="erp-spinner-anim" 
            viewBox="0 0 160 160" 
            style={{ width: "100%", height: "100%", display: "block" }}
          >
            <g strokeWidth="20" fill="none" strokeLinecap="butt">
              {segmentColors.map((color, index) => {
                const rotation = -90 + (index * 30);
                return (
                  <circle
                    key={index}
                    cx="80"
                    cy="80"
                    r="60"
                    stroke={color}
                    strokeDasharray="26 351"
                    transform={`rotate(${rotation} 80 80)`}
                  />
                );
              })}
            </g>
          </svg>
        </div>

        {/* Status text */}
        <div 
          className="text-uppercase fw-semibold"
          style={{
            marginTop: "24px",
            color: "#6bb0d8",
            fontSize: "18px",
            letterSpacing: "4px"
          }}
        >
          {text}
        </div>

        {/* Subtext */}
        {subtext && (
          <div 
            className="text-muted text-center px-3" 
            style={{ marginTop: "6px", fontSize: "13px", letterSpacing: "0.5px" }}
          >
            {subtext}
          </div>
        )}

        {/* 5-second timeout fallback buttons */}
        {showRetry && (
          <div className="mt-4 d-flex gap-2">
            <button 
              type="button" 
              className="btn btn-outline-primary btn-sm px-3"
              onClick={onRetry || (() => window.location.reload())}
            >
              Retry
            </button>
            <a href="/login" className="btn btn-outline-secondary btn-sm px-3">
              Go to Login
            </a>
          </div>
        )}
      </div>
    </>
  );
};

export default LoadingSpinner;