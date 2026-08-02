import type { Metadata } from 'next';
import NavigationSidebar from '@/components/common/NavigationSidebar';
import DiscountCodesManagementInteractive from './components/DiscountCodesManagementInteractive';

export const metadata: Metadata = {
  title: 'Descuentos - Citalia',
  description: 'Administra los códigos promocionales del salón: porcentajes, valores fijos, vigencia y reglas de uso.',
};

export default function DiscountCodesManagementPage() {
  return (
    <>
      <NavigationSidebar />
      <DiscountCodesManagementInteractive />
    </>
  );
}
