

import React from 'react';

// A simple hashing function to get a color from a string
const stringToColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = '#';
    for (let i = 0; i < 3; i++) {
        const value = (hash >> (i * 8)) & 0xFF;
        color += ('00' + value.toString(16)).substr(-2);
    }
    return color;
};

// Function to determine if a color is light or dark
const isColorLight = (hexcolor: string) => {
    const r = parseInt(hexcolor.substr(1, 2), 16);
    const g = parseInt(hexcolor.substr(3, 2), 16);
    const b = parseInt(hexcolor.substr(5, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return yiq >= 128;
};


interface AvatarProps {
  name: string;
  imageUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const Avatar: React.FC<AvatarProps> = ({ name, imageUrl, size = 'md', className = '' }) => {
    const getInitials = (name: string): string => {
        if (!name) return '?';
        const names = name.trim().split(' ').filter(n => n);
        if (names.length === 0) return '?';
        if (names.length === 1) return names[0][0].toUpperCase();
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    };

    const initials = getInitials(name);
    const backgroundColor = stringToColor(name || 'default');
    const textColor = isColorLight(backgroundColor) ? 'text-slate-800' : 'text-white';

    const sizeClasses = {
        sm: 'h-8 w-8 text-xs',
        md: 'h-10 w-10 text-sm',
        lg: 'h-24 w-24 text-3xl',
        xl: 'h-32 w-32 text-4xl',
    };
    
    // Allow className prop to override default size classes if needed for custom positioning
    const finalClassName = `flex-shrink-0 rounded-full object-cover flex items-center justify-center ${sizeClasses[size]} ${className}`;

    if (imageUrl) {
        return (
            <img
                src={imageUrl}
                alt={name}
                className={finalClassName}
            />
        );
    }

    return (
        <div
            className={finalClassName}
            style={{ backgroundColor }}
        >
            <span className={textColor}>{initials}</span>
        </div>
    );
};

export default Avatar;