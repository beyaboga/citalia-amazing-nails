'use client';

import Icon from '@/components/ui/AppIcon';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination = ({ currentPage, totalPages, onPageChange }: PaginationProps) => {
  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const showEllipsis = totalPages > 7;

    if (!showEllipsis) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <div className="flex items-center justify-between gap-4 bg-card rounded-lg border border-border p-4 shadow-warm">
      <button
        onClick={handlePrevious}
        disabled={currentPage === 1}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-input hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        <Icon name="ChevronLeftIcon" size={16} />
        <span className="caption font-medium hidden sm:inline">Anterior</span>
      </button>

      <div className="flex items-center gap-2">
        {getPageNumbers().map((page, index) => (
          typeof page === 'number' ? (
            <button
              key={index}
              onClick={() => onPageChange(page)}
              className={`w-10 h-10 rounded-lg caption font-medium transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                currentPage === page
                  ? 'bg-primary text-primary-foreground shadow-warm'
                  : 'hover:bg-muted text-foreground'
              }`}
            >
              {page}
            </button>
          ) : (
            <span key={index} className="w-10 h-10 flex items-center justify-center text-muted-foreground">
              {page}
            </span>
          )
        ))}
      </div>

      <button
        onClick={handleNext}
        disabled={currentPage === totalPages}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-input hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        <span className="caption font-medium hidden sm:inline">Siguiente</span>
        <Icon name="ChevronRightIcon" size={16} />
      </button>
    </div>
  );
};

export default Pagination;