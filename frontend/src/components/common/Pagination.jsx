import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Pagination = ({ pagination = {}, onPageChange }) => {
  const { page = 1, totalPages = 1, total = 0, pages = 1 } = pagination;
  const effectiveTotalPages = totalPages || pages || 1;

  if (effectiveTotalPages <= 1) return null;

  return (
    <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center gap-2">
      <small className="text-muted" style={{ fontSize: '0.78rem' }}>
        Showing page <strong className="text-dark">{page}</strong> of{' '}
        <strong className="text-dark">{effectiveTotalPages}</strong> ({total} total records)
      </small>

      <div className="d-flex align-items-center gap-1">
        <button
          type="button"
          className="erp-btn erp-btn-secondary erp-btn-sm p-1.5"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous Page"
        >
          <ChevronLeft size={15} />
        </button>

        <span
          className="px-2.5 py-1 small fw-semibold font-monospace rounded-2 bg-light border text-muted"
          style={{ fontSize: '0.75rem' }}
        >
          {page} / {effectiveTotalPages}
        </span>

        <button
          type="button"
          className="erp-btn erp-btn-secondary erp-btn-sm p-1.5"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= effectiveTotalPages}
          aria-label="Next Page"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
