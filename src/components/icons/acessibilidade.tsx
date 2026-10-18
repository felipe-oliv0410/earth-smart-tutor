const STROKE = 22;

/**
 * Símbolo universal de acessibilidade em estilo "homem vitruviano":
 * figura humana com nós preenchidos (cabeça, mãos e pés) dentro de um
 * círculo quebrado. O traço usa currentColor e o preenchimento usa
 * --icon-accent, para que o ícone se adapte ao alto contraste.
 */
export function IconeAcessibilidade({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 512 512"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {/* Círculo externo quebrado em três arcos */}
      <path d="M101.8 415.7A222 222 0 0 1 34.3 244.4" />
      <path d="M74.1 128.7A222 222 0 0 1 437.9 128.7" />
      <path d="M477.7 244.4A222 222 0 0 1 410.2 415.7" />
      {/* Braços e pernas */}
      <path d="M46 184Q256 340 466 184" />
      <path d="M152 452L256 262L360 452" />
      {/* Cabeça, mãos e pés */}
      <g fill="var(--icon-accent, currentColor)">
        <circle cx="256" cy="138" r="60" />
        <circle cx="46" cy="184" r="34" />
        <circle cx="466" cy="184" r="34" />
        <circle cx="152" cy="452" r="34" />
        <circle cx="360" cy="452" r="34" />
      </g>
    </svg>
  );
}
