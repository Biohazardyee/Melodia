import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    variant?: 'primary' | 'social';
}

export const Button: React.FC<ButtonProps> = ({
                                                  children,
                                                  variant = 'primary',
                                                  className,
                                                  ...props
                                              }) => {
    const baseStyle = "transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed";

    const styles = {
        primary: `${baseStyle} primary-action w-full py-3.5 text-base`,
        social: `${baseStyle} secondary-action w-full text-xl`
    };

    return (
        <button
            className={`${styles[variant]} ${className || ''}`}
            {...props}
        >
            {children}
        </button>
    );
};
