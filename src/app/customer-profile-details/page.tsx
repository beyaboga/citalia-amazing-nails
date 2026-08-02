import { Suspense } from 'react';
import NavigationSidebar from '@/components/common/NavigationSidebar';
import CustomerProfileDetailsInteractive from './components/CustomerProfileDetailsInteractive';

function CustomerProfileDetailsContent() {
  return <CustomerProfileDetailsInteractive />;
}

export default function CustomerProfileDetailsPage() {
  return (
    <>
      <NavigationSidebar />
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen md:ml-[280px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      }>
        <CustomerProfileDetailsContent />
      </Suspense>
    </>
  );
}