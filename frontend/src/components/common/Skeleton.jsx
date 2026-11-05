import React from 'react';

/**
 * Enterprise Skeleton Loading Components
 */

export const CardSkeleton = ({ count = 4 }) => {
  return (
    <div className="row g-3">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="col-12 col-sm-6 col-xl-3">
          <div className="erp-card p-3 p-md-4">
            <div className="d-flex justify-content-between mb-3">
              <div className="erp-skeleton" style={{ width: '45%', height: '14px' }} />
              <div className="erp-skeleton rounded-circle" style={{ width: '32px', height: '32px' }} />
            </div>
            <div className="erp-skeleton mb-2" style={{ width: '60%', height: '28px' }} />
            <div className="erp-skeleton" style={{ width: '75%', height: '12px' }} />
          </div>
        </div>
      ))}
    </div>
  );
};

export const TableSkeleton = ({ rows = 5, cols = 5 }) => {
  return (
    <div className="erp-table-container">
      <div className="p-3 border-bottom d-flex justify-content-between align-items-center">
        <div className="erp-skeleton" style={{ width: '220px', height: '34px' }} />
        <div className="erp-skeleton" style={{ width: '120px', height: '34px' }} />
      </div>
      <table className="erp-table">
        <thead>
          <tr>
            {[...Array(cols)].map((_, i) => (
              <th key={i}>
                <div className="erp-skeleton" style={{ width: '70px', height: '12px' }} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...Array(rows)].map((_, r) => (
            <tr key={r}>
              {[...Array(cols)].map((_, c) => (
                <td key={c}>
                  <div className="erp-skeleton" style={{ width: `${50 + (c * 10)}%`, height: '14px' }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const PageSkeleton = () => {
  return (
    <div className="erp-fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <div className="erp-skeleton mb-2" style={{ width: '180px', height: '24px' }} />
          <div className="erp-skeleton" style={{ width: '260px', height: '14px' }} />
        </div>
        <div className="erp-skeleton" style={{ width: '120px', height: '38px' }} />
      </div>
      <CardSkeleton count={4} />
      <div className="mt-4">
        <TableSkeleton rows={6} cols={6} />
      </div>
    </div>
  );
};

export default { CardSkeleton, TableSkeleton, PageSkeleton };
