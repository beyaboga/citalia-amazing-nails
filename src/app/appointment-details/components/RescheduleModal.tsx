'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';

interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (date: string, time: string) => void;
  appointmentId: string;
  currentDate: string;
  currentTime: string;
}

const RescheduleModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  appointmentId,
  currentDate,
  currentTime 
}: RescheduleModalProps) => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isOpen && isHydrated) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isHydrated]);

  const handleConfirm = () => {
    if (selectedDate && selectedTime) {
      onConfirm(selectedDate, selectedTime);
      setSelectedDate('');
      setSelectedTime('');
    }
  };

  const handleClose = () => {
    setSelectedDate('');
    setSelectedTime('');
    onClose();
  };

  if (!isHydrated || !isOpen) return null;

  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
  ];

  const isValid = selectedDate && selectedTime;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />
      
      <div className="relative bg-card rounded-lg shadow-warm-xl border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border p-6 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                <Icon name="ArrowPathIcon" size={20} className="text-accent" />
              </div>
              <div>
                <h2 className="font-heading text-lg font-semibold text-foreground">
                  Reprogramar Cita
                </h2>
                <p className="caption text-muted-foreground text-sm">
                  Cita #{appointmentId}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-lg hover:bg-muted transition-smooth flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              aria-label="Cerrar modal"
            >
              <Icon name="XMarkIcon" size={20} className="text-muted-foreground" />
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <p className="caption text-muted-foreground text-sm mb-2">Cita actual:</p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Icon name="CalendarIcon" size={16} className="text-primary" />
                <span className="font-medium text-foreground">{currentDate}</span>
              </div>
              <div className="flex items-center gap-2">
                <Icon name="ClockIcon" size={16} className="text-primary" />
                <span className="font-medium text-foreground">{currentTime}</span>
              </div>
            </div>
          </div>
          
          <div>
            <label htmlFor="new-date" className="block font-medium text-foreground text-sm mb-2">
              Nueva fecha *
            </label>
            <input
              type="date"
              id="new-date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-smooth"
            />
          </div>
          
          <div>
            <label className="block font-medium text-foreground text-sm mb-3">
              Nueva hora *
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {timeSlots.map((time) => (
                <button
                  key={time}
                  onClick={() => setSelectedTime(time)}
                  className={`
                    px-3 py-2 rounded-lg border text-sm font-medium transition-smooth
                    focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                    ${selectedTime === time
                      ? 'bg-primary text-primary-foreground border-primary shadow-warm'
                      : 'bg-card text-foreground border-border hover:bg-muted'
                    }
                  `}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        <div className="sticky bottom-0 bg-card border-t border-border p-6 flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 px-4 h-12 rounded-lg bg-card text-foreground border border-border font-medium text-sm hover:bg-muted transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isValid}
            className="flex-1 px-4 h-12 rounded-lg bg-accent text-accent-foreground font-medium text-sm shadow-warm hover:shadow-warm-md hover:bg-accent/90 transition-smooth focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-warm"
          >
            Confirmar Reprogramación
          </button>
        </div>
      </div>
    </div>
  );
};

export default RescheduleModal;