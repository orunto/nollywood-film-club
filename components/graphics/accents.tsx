interface AccentProps {
    className?: string;
    size?: number;
}

/* Flat geometric accent marks. All draw in currentColor so callers set
   color with text-* utilities (text-black, text-primary, text-white). */

export function Starburst({ className, size = 28 }: AccentProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 28 28"
            aria-hidden="true"
            className={className}
        >
            <path
                fill="currentColor"
                d="M15.7599 6.82888L20.4322 2.02579L23.1441 4.80309L18.2431 9.47548H25.1372V13.331H18.2104L23.1441 18.1232L20.4322 20.8461L13.7341 14.1152L7.03604 20.8461L4.32414 18.1341L9.25784 13.3419H2.33105V9.47548H9.22516L4.32414 4.80309L7.03604 2.02579L11.7084 6.82888V0H15.7599V6.82888ZM11.7084 18.8529H15.7599V28.0017H11.7084V18.8529Z"
            />
        </svg>
    );
}

export function Asterisk({ className, size = 28 }: AccentProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 28 28"
            aria-hidden="true"
            className={className}
        >
            <g stroke="currentColor" strokeWidth="3.5" strokeLinecap="round">
                <line x1="14" y1="3" x2="14" y2="25" />
                <line x1="4.5" y1="8.5" x2="23.5" y2="19.5" />
                <line x1="23.5" y1="8.5" x2="4.5" y2="19.5" />
            </g>
        </svg>
    );
}

export function Sparkle({ className, size = 28 }: AccentProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 28 28"
            aria-hidden="true"
            className={className}
        >
            <path
                fill="currentColor"
                d="M14 1C15.2 8.2 19.8 12.8 27 14C19.8 15.2 15.2 19.8 14 27C12.8 19.8 8.2 15.2 1 14C8.2 12.8 12.8 8.2 14 1Z"
            />
        </svg>
    );
}

export function Arc({ className, size = 28 }: AccentProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 28 28"
            aria-hidden="true"
            className={className}
        >
            <path fill="currentColor" d="M2 26A24 24 0 0 1 26 2V26H2Z" />
        </svg>
    );
}

export function DotGrid({ className, size = 28 }: AccentProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 28 28"
            aria-hidden="true"
            className={className}
        >
            <g fill="currentColor">
                {[5, 14, 23].map((cy) =>
                    [5, 14, 23].map((cx) => (
                        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2.4" />
                    )),
                )}
            </g>
        </svg>
    );
}
