import React, {useId} from 'react';
import {IconType} from 'react-icons';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    icon: IconType;
}

export const Input: React.FC<InputProps> = ({label, icon: Icon, id, className = '', ...props}) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    return (
    <div className="space-y-2">
        <label htmlFor={inputId} className="text-sm font-semibold ml-1 text-gray-300 dark:text-gray-700">
            {label}
        </label>
        <div className="relative group">
            <Icon
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-muted group-focus-within:text-blue-500 transition-colors"/>
            <input
                {...props}
                id={inputId}
                className={`w-full bg-raised border border-line rounded-xl py-3.5 px-12 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all placeholder:text-muted text-ink ${className}`}
            />
        </div>
    </div>
    );
};
