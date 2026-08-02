const LoadingSkeleton = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {[...Array(8)]?.map((_, index) => (
        <div key={index} className="bg-card rounded-lg border border-border overflow-hidden animate-pulse">
          <div className="h-48 bg-muted" />
          <div className="p-4">
            <div className="h-6 bg-muted rounded mb-2" />
            <div className="h-4 bg-muted rounded w-3/4 mb-4" />
            <div className="flex items-center gap-4 mb-4">
              <div className="h-4 bg-muted rounded w-20" />
              <div className="h-4 bg-muted rounded w-16" />
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-10 bg-muted rounded-lg" />
              <div className="w-10 h-10 bg-muted rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default LoadingSkeleton;