import { useTheme } from '../../context/ThemeContext';

export default function ThemeToggle({ className }) {
  const { toggleTheme } = useTheme();
  return (
    <button
      className={`theme-toggle ${className || ''}`}
      title="Toggle dark/light mode"
      onClick={toggleTheme}
    />
  );
}
