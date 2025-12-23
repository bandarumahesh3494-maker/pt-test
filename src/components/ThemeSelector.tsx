import React, { useState } from 'react';
import { Palette } from 'lucide-react';
import { useTheme, ThemeOption } from '../contexts/ThemeContext';

export const ThemeSelector: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const themes: { value: ThemeOption; label: string; description: string; preview: string; accent: string }[] = [
    { value: 'corporate', label: 'Corporate', description: 'Professional gray with blue accents', preview: 'bg-gray-800', accent: 'bg-blue-600' },
    { value: 'productivity', label: 'Productivity', description: 'Clean slate with sky blue', preview: 'bg-slate-800', accent: 'bg-sky-600' },
    { value: 'tech', label: 'Tech', description: 'Modern zinc with bright blue', preview: 'bg-zinc-900', accent: 'bg-blue-500' },
    { value: 'agile', label: 'Agile', description: 'Warm stone with green accents', preview: 'bg-stone-800', accent: 'bg-green-600' },
    { value: 'modern', label: 'Modern', description: 'Dark slate with teal highlights', preview: 'bg-slate-900', accent: 'bg-teal-600' },
    { value: 'executive', label: 'Executive', description: 'Elegant neutral with gold accents', preview: 'bg-neutral-900', accent: 'bg-amber-600' },
    { value: 'light', label: 'Light', description: 'Clean white background with blue accents', preview: 'bg-white', accent: 'bg-blue-600' }
  ];

  const handleThemeChange = (newTheme: ThemeOption) => {
    setTheme(newTheme);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors border border-gray-600"
      >
        <Palette className="w-5 h-5" />
        Theme
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
            <div className="p-3 border-b border-gray-700">
              <div className="text-sm font-semibold text-gray-200">Project Management Themes</div>
            </div>
            <div className="p-2 space-y-1">
              {themes.map(({ value, label, description, preview, accent }) => (
                <button
                  key={value}
                  onClick={() => handleThemeChange(value)}
                  className={`w-full flex items-start gap-3 px-3 py-3 rounded transition-colors ${
                    theme === value
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-gray-700 text-gray-300'
                  }`}
                >
                  <div className="flex gap-1.5 pt-0.5">
                    <div className={`w-5 h-5 rounded ${preview} border-2 ${theme === value ? 'border-white' : 'border-gray-600'}`} />
                    <div className={`w-5 h-5 rounded ${accent} border-2 ${theme === value ? 'border-white' : 'border-gray-600'}`} />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium">{label}</div>
                    <div className={`text-xs ${theme === value ? 'text-blue-100' : 'text-gray-400'}`}>
                      {description}
                    </div>
                  </div>
                  {theme === value && (
                    <span className="text-sm pt-0.5">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
