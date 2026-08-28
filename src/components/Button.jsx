export default function Button({ variant = 'primary', children, className = '', ...props }) {
  return (
    <button className={`lumo-btn lumo-btn--${variant} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}
