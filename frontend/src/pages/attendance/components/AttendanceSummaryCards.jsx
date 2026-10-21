import React from 'react';

const AttendanceSummaryCards = ({ data = {}, loading = false }) => {
  const cards = [
    {
      title: 'Total Workforce',
      value: data.totalEmployees ?? 0,
      icon: '👥',
      color: '#2563EB',
      bg: '#EFF6FF',
      subtitle: 'Registered Active Staff',
    },
    {
      title: 'Present Today',
      value: data.presentToday ?? 0,
      icon: '✅',
      color: '#059669',
      bg: '#ECFDF5',
      subtitle: 'On-duty & Logged In',
    },
    {
      title: 'Absent Today',
      value: data.absentToday ?? 0,
      icon: '❌',
      color: '#DC2626',
      bg: '#FEF2F2',
      subtitle: 'Unexcused / No punch',
    },
    {
      title: 'Late Arrivals',
      value: data.lateArrivals ?? 0,
      icon: '⏱️',
      color: '#D97706',
      bg: '#FFFBEB',
      subtitle: 'Past grace period',
    },
    {
      title: 'Half-Day Marked',
      value: data.halfDayEmployees ?? 0,
      icon: '⏳',
      color: '#7C3AED',
      bg: '#F5F3FF',
      subtitle: 'Completed 4h+ only',
    },
    {
      title: 'On Approved Leave',
      value: data.employeesOnLeave ?? 0,
      icon: '🏖️',
      color: '#475569',
      bg: '#F8FAFC',
      subtitle: 'Pre-sanctioned leave',
    },
    {
      title: 'Currently Active',
      value: data.currentlyWorking ?? 0,
      icon: '🟢',
      color: '#0D9488',
      bg: '#F0FDFA',
      subtitle: 'Live punch-in session',
    },
    {
      title: 'Missing Punch-Outs',
      value: data.missingPunchOuts ?? 0,
      icon: '⚠️',
      color: '#EA580C',
      bg: '#FFF7ED',
      subtitle: 'Action required',
    },
    {
      title: 'Overtime Logged',
      value: `${data.totalOvertimeHours ?? 0}h`,
      icon: '📈',
      color: '#4338CA',
      bg: '#EEF2FF',
      subtitle: 'Extra authorized hours',
    },
    {
      title: 'Attendance Rate',
      value: `${data.attendancePercentage ?? 0}%`,
      icon: '📊',
      color: '#0284C7',
      bg: '#F0F9FF',
      subtitle: 'Overall team ratio',
    },
  ];

  return (
    <div>
      <style>{`
        .kpi-grid-container {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 0.75rem;
          width: 100%;
        }

        .kpi-tile-card {
          background-color: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          padding: 0.85rem 1rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 102px;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
        }

        .kpi-tile-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 10px rgba(15, 23, 42, 0.06);
          border-color: #CBD5E1;
        }

        @media (max-width: 576px) {
          .kpi-grid-container {
            grid-template-columns: repeat(2, 1fr);
            gap: 0.5rem;
          }
          .kpi-tile-card {
            padding: 0.7rem;
            min-height: 94px;
          }
        }
      `}</style>

      <div className="kpi-grid-container mb-4">
        {cards.map((card, idx) => (
          <div key={idx} className="kpi-tile-card">
            {/* Header: Title and Icon */}
            <div className="d-flex align-items-center justify-content-between mb-1">
              <span
                className="text-truncate fw-semibold"
                style={{ fontSize: '11px', color: '#475569', maxWidth: '80%' }}
                title={card.title}
              >
                {card.title}
              </span>

              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  backgroundColor: card.bg,
                  color: card.color,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                }}
              >
                {card.icon}
              </div>
            </div>

            {/* Value */}
            <div className="mt-auto">
              {loading ? (
                <div className="placeholder-glow py-1">
                  <span
                    className="placeholder col-8"
                    style={{ height: '22px', borderRadius: '4px' }}
                  ></span>
                </div>
              ) : (
                <div
                  className="fw-bold"
                  style={{
                    fontSize: '1.35rem',
                    color: '#0F172A',
                    lineHeight: 1.2,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {card.value}
                </div>
              )}

              {/* Subtitle */}
              <div
                className="text-truncate"
                style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 500 }}
              >
                {card.subtitle}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AttendanceSummaryCards;