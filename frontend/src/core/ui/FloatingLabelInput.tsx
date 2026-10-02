import { useState, InputHTMLAttributes, ChangeEvent } from 'react';

export interface FloatingLabelInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  id: string;
  label: string;
  value?: string | number;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  error?: string | null;
}

/**
 * FloatingLabelInput — Campo Outlined con Etiqueta Animada Flotante
 * Norma Cardinal de Diseño Ateneo+:
 * La etiqueta sube al borde superior al enfocar o si el campo contiene texto.
 */
export default function FloatingLabelInput({
  id,
  label,
  type = 'text',
  value = '',
  onChange,
  required = false,
  autoFocus = false,
  disabled = false,
  error = null,
  className = '',
  ...props
}: FloatingLabelInputProps) {
  const [focused, setFocused] = useState<boolean>(false);
  const isFloating = focused || (value !== undefined && String(value).length > 0);

  return (
    <div className={`relative pt-2 ${className}`}>
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          required={required}
          autoFocus={autoFocus}
          disabled={disabled}
          placeholder={label}
          className={`w-full px-4 py-3.5 bg-transparent rounded-[4px] text-base text-[#1f1f1f] focus:outline-none transition-all font-normal placeholder-transparent peer disabled:opacity-50 disabled:cursor-not-allowed ${
            error
              ? 'border-2 border-rose-600'
              : focused
              ? 'border-2 border-[#0b57d0]'
              : 'border border-[#747775] hover:border-[#1f1f1f]'
          }`}
          {...props}
        />
        <label
          htmlFor={id}
          className={`absolute left-3 transition-all duration-150 pointer-events-none bg-white px-1 leading-none ${
            isFloating
              ? `-top-2 text-xs font-normal ${error ? 'text-rose-600 font-medium' : focused ? 'text-[#0b57d0] font-medium' : 'text-[#444746]'}`
              : 'top-4 text-base font-normal text-[#444746]'
          }`}
        >
          {label}
        </label>
      </div>
      {error && (
        <p className="text-xs text-rose-600 mt-1 pl-1 font-medium">{error}</p>
      )}
    </div>
  );
}
