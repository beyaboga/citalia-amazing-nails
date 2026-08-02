import AppImage from '@/components/ui/AppImage';
import BrandLogo from '@/components/ui/BrandLogo';

const LoginBranding = () => {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-card shadow-warm mb-4">
          <BrandLogo size={52} />
        </div>
        
        <div className="space-y-2">
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-foreground">
            Citalia
          </h1>
          <p className="caption text-muted-foreground text-base">
            Agenda. Administra. Crece.
          </p>
        </div>
      </div>

      <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden shadow-warm-lg">
        <AppImage
          src="https://images.pexels.com/photos/4677846/pexels-photo-4677846.jpeg"
          alt="Manicurista profesional aplicando esmalte a una clienta durante un servicio en el salón"
          className="w-full h-full object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
        <div className="absolute bottom-6 left-6 right-6">
          <p className="text-sm text-foreground font-medium">
            Gestión profesional de servicios de belleza
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="text-center space-y-1">
          <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="var(--color-primary)" />
              <path d="M2 17L12 22L22 17" stroke="var(--color-primary)" strokeWidth="2" />
            </svg>
          </div>
          <p className="caption text-xs text-muted-foreground">Gestión de Citas</p>
        </div>
        <div className="text-center space-y-1">
          <div className="w-12 h-12 mx-auto rounded-full bg-accent/10 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
              <circle cx="12" cy="12" r="10" stroke="var(--color-accent)" strokeWidth="2" />
              <path d="M12 6V12L16 14" stroke="var(--color-accent)" strokeWidth="2" />
            </svg>
          </div>
          <p className="caption text-xs text-muted-foreground">Servicios</p>
        </div>
        <div className="text-center space-y-1">
          <div className="w-12 h-12 mx-auto rounded-full bg-secondary/10 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="var(--color-secondary)" strokeWidth="2" />
              <path d="M9 11L12 14L15 11" stroke="var(--color-secondary)" strokeWidth="2" />
            </svg>
          </div>
          <p className="caption text-xs text-muted-foreground">Reportes</p>
        </div>
      </div>
    </div>
  );
};

export default LoginBranding;