/** The wordmark's curl. A single strand loosening into a coil. */
export const CurlMark = ({ size = 19 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.2}
    strokeLinecap="round"
    aria-hidden
  >
    <path d="M12 21c4.5 0 7-2.8 7-6s-2.5-5-5.2-5C11.6 10 10 11.3 10 13c0 1.4 1.1 2.4 2.4 2.4 1.1 0 1.9-.7 1.9-1.6" />
    <path d="M12 21c-4.4 0-7.4-3.2-7.4-7.3C4.6 7.9 8.3 3 14.3 3" />
  </svg>
);
