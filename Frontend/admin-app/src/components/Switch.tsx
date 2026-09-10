import './Switch.css';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  id?: string;
}

/** Accessible on/off row — label + optional description are part of the
 * click target, not just the visual switch, per the project's switch-row
 * pattern used across the redesigned /menu drawer. */
export function Switch({ checked, onChange, label, description, disabled, id }: SwitchProps) {
  return (
    <label className={`switch-row ${disabled ? 'is-disabled' : ''}`} htmlFor={id}>
      <span className="switch-row-text">
        <span className="switch-row-label">{label}</span>
        {description && <span className="switch-row-desc">{description}</span>}
      </span>
      <span className="switch-control" data-checked={checked}>
        <input
          id={id}
          type="checkbox"
          role="switch"
          aria-checked={checked}
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="switch-track">
          <span className="switch-thumb" />
        </span>
      </span>
    </label>
  );
}
