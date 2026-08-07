

import "../styles/buttons.css";

export default function Button({ children, variant = "", className = "", ...props }) {
  const variants = {
    molten: "btn-molten",
    outline: "btn-outline-shimmer",
  };

  return (
    <button className={`${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}