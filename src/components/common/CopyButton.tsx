'use client';

import { useState } from 'react';
import Icon from '@/components/ui/AppIcon';

interface CopyButtonProps {
  text: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
}

/**
 * Botón que copia un texto al portapapeles y muestra "Copiado" un momento.
 * Incluye un respaldo con execCommand para contextos sin la API de portapapeles.
 */
const CopyButton = ({ text, label = 'Copiar mensaje', copiedLabel = 'Copiado', className }: CopyButtonProps) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
      } catch {
        /* sin portapapeles disponible */
      }
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={copy}
      className={
        className ??
        'flex-1 h-11 px-4 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 transition-smooth flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary'
      }
    >
      <Icon name={copied ? 'CheckIcon' : 'ClipboardDocumentIcon'} size={18} className={copied ? 'text-success' : ''} />
      {copied ? copiedLabel : label}
    </button>
  );
};

export default CopyButton;
