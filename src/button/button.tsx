import './button.scoped.css';
import type { ButtonHTMLAttributes, FC } from "react"

export const Button: FC<ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, ...props }) => {
  return (
    <button {...props}>
      {children}
    </button>
  )
}