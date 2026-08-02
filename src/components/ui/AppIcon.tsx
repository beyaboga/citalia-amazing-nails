'use client';

import React from 'react';
import * as HeroIcons from '@heroicons/react/24/outline';
import * as HeroIconsSolid from '@heroicons/react/24/solid';
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline';

// Heroicons has no brand/social logos — these fill that gap, drawn in the
// same 24x24 stroked-outline style as the rest of the Heroicons set so they
// blend in wherever <Icon name="InstagramIcon" /> etc. is used.
const InstagramIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="17.3" cy="6.7" r="1" fill="currentColor" />
    </svg>
);

const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path
            d="M15 4h-2a4 4 0 0 0-4 4v2H7v3h2v7h3v-7h2.5l.5-3H12V8a1 1 0 0 1 1-1h2V4Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
        />
    </svg>
);

const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path d="M5 5l14 14M19 5L5 19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
);

const YoutubeIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <rect x="2.5" y="6" width="19" height="12" rx="4" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10.5 9.7v4.6l4-2.3-4-2.3Z" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
    </svg>
);

const BRAND_ICONS: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
    InstagramIcon,
    FacebookIcon,
    XIcon,
    YoutubeIcon,
};

type IconVariant = 'outline' | 'solid';

interface IconProps {
    name: string; // Changed to string to accept dynamic values
    variant?: IconVariant;
    size?: number;
    className?: string;
    onClick?: () => void;
    disabled?: boolean;
    [key: string]: any;
}

function Icon({
    name,
    variant = 'outline',
    size = 24,
    className = '',
    onClick,
    disabled = false,
    ...props
}: IconProps) {
    const iconSet = variant === 'solid' ? HeroIconsSolid : HeroIcons;
    const IconComponent = (BRAND_ICONS[name] ?? iconSet[name as keyof typeof iconSet]) as React.ComponentType<any>;

    if (!IconComponent) {
        return (
            <QuestionMarkCircleIcon
                width={size}
                height={size}
                className={`text-gray-400 ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
                onClick={disabled ? undefined : onClick}
                {...props}
            />
        );
    }

    return (
        <IconComponent
            width={size}
            height={size}
            className={`${disabled ? 'opacity-50 cursor-not-allowed' : onClick ? 'cursor-pointer hover:opacity-80' : ''} ${className}`}
            onClick={disabled ? undefined : onClick}
            {...props}
        />
    );
}

export default Icon; 