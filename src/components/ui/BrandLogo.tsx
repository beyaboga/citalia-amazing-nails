import { useId } from 'react';

interface BrandLogoProps {
  /** Tamaño en píxeles del icono (ancho y alto). */
  size?: number;
  className?: string;
  /** Título accesible del SVG. */
  title?: string;
}

/**
 * Isotipo de Citalia: un calendario abierto en forma de "C" con degradado
 * azul → morado → turquesa, sus dos pestañas superiores y la cuadrícula de días.
 *
 * Es un SVG vectorial (nítido a cualquier tamaño e independiente del tema),
 * reconstruido a partir del logotipo de marca.
 */
const BrandLogo = ({ size = 40, className, title = 'Citalia' }: BrandLogoProps) => {
  // Los degradados/máscara necesitan ids únicos por instancia para no colisionar
  // cuando el logo se renderiza más de una vez en la misma página.
  const uid = useId().replace(/:/g, '');
  const strokeGrad = `citalia-stroke-${uid}`;
  const dotGrad = `citalia-dot-${uid}`;

  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      width={size}
      height={size}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <defs>
        <linearGradient id={strokeGrad} x1="8" y1="10" x2="40" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#E08BB4" />
          <stop offset="0.5" stopColor="#D4669A" />
          <stop offset="1" stopColor="#8B5A7C" />
        </linearGradient>
        <linearGradient id={dotGrad} x1="14" y1="20" x2="34" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#EDB088" />
          <stop offset="1" stopColor="#E8A87C" />
        </linearGradient>
      </defs>

      {/* Pestañas superiores del calendario */}
      <rect x="16.5" y="5" width="4" height="8" rx="2" fill="#E8A87C" />
      <rect x="27.5" y="5" width="4" height="8" rx="2" fill="#E8A87C" />

      {/* Cuerpo del calendario abierto formando la "C" */}
      <path
        d="M38 11H16A6 6 0 0 0 10 17V35A6 6 0 0 0 16 41H38"
        stroke={`url(#${strokeGrad})`}
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Cuadrícula de días: 2 filas x 3 columnas */}
      {[22, 29].map((y) =>
        [16, 22, 28].map((x) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="4.4" height="4.4" rx="1.2" fill={`url(#${dotGrad})`} />
        )),
      )}
    </svg>
  );
};

export default BrandLogo;
