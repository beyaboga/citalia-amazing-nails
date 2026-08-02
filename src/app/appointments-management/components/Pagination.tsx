'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  totalItems: number;
}

const Pagination = ({ currentPage, totalPages, onPageChange, itemsPerPage, totalItems }: PaginationProps) => {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

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

  const handlePageClick = (page: number | string) => {
    if (typeof page === 'number') {
      onPageChange(page);
    }
  };

  if (!isHydrated || totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6">
      <p className="caption text-sm text-muted-foreground">
        Mostrando <span className="font-medium text-foreground">{startItem}</span> a{' '}
        <span className="font-medium text-foreground">{endItem}</span> de{' '}
        <span className="font-medium text-foreground">{totalItems}</span> resultados
      </p>

      <div className="flex items-center gap-2">
        <button
          onClick={handlePrevious}
          disabled={currentPage === 1}
          className="flex items-center justify-center w-10 h-10 rounded-lg border border-border text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          aria-label="Página anterior"
        >
          <Icon name="ChevronLeftIcon" size={20} />
        </button>

        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, index) => (
            <button
              key={index}
              onClick={() => handlePageClick(page)}
              disabled={page === '...'}
              className={`flex items-center justify-center min-w-[40px] h-10 px-3 rounded-lg font-medium text-sm transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                page === currentPage
                  ? 'bg-primary text-primary-foreground shadow-warm'
                  : page === '...' ?'text-muted-foreground cursor-default' :'text-foreground hover:bg-muted'
              }`}
            >
              {page}
            </button>
          ))}
        </div>

        <button
          onClick={handleNext}
          disabled={currentPage === totalPages}
          className="flex items-center justify-center w-10 h-10 rounded-lg border border-border text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          aria-label="Página siguiente"
        >
          <Icon name="ChevronRightIcon" size={20} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;