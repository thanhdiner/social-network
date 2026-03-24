import React, { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

type Option = { label: string; value: string }

type Props = {
  options: Option[]
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

const CustomSelect: React.FC<Props> = ({ options, value, onChange, placeholder, className, disabled }) => {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!rootRef.current) return
      if (!rootRef.current.contains(e.target as Node)) setOpen(false)
    }

    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const selected = options.find((o) => o.value === value) || null

  return (
    <div ref={rootRef} className={`custom-select-wrapper ${className || ''} ${disabled ? 'disabled' : ''}`}>
      <button
        type="button"
        className="custom-select-button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => !disabled && setOpen((s) => !s)}
        disabled={disabled}
      >
        <span className="custom-select-label">{selected ? selected.label : placeholder || 'Chọn'}</span>
        <ChevronDown size={16} />
      </button>

      {open && (
        <ul role="listbox" className="custom-select-list">
          {options.map((opt) => (
            <li
              key={opt.value}
              role="option"
              aria-selected={opt.value === value}
              className={`custom-select-item ${opt.value === value ? 'selected' : ''}`}
              onClick={() => {
                onChange(opt.value)
                setOpen(false)
              }}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default CustomSelect
