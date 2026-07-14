interface IllustrationProps {
    className?: string;
}

/* Monochrome spot illustrations for empty states. Stroke-based to match
   the flat black/white system; color via text-* utilities. Typical usage:
   <EmptyReviewsIllustration className="w-24 md:w-28 mx-auto mb-4 text-black/70" /> */

export function EmptyCatalogueIllustration({ className }: IllustrationProps) {
    return (
        <svg
            viewBox="0 0 120 96"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={className}
        >
            {/* clapperboard body */}
            <rect x="26" y="40" width="60" height="32" rx="3" />
            {/* open slate, tilted */}
            <path d="M24 36L82 24L84 33L26 45Z" />
            <path d="M38 33L42 41" />
            <path d="M52 30L56 38" />
            <path d="M66 27L70 35" />
            {/* play mark inside the body */}
            <path d="M52 50L64 56L52 62Z" />
            {/* sparkle accent */}
            <path
                d="M98 14C98.9 19 101.5 21.6 106.5 22.5C101.5 23.4 98.9 26 98 31C97.1 26 94.5 23.4 89.5 22.5C94.5 21.6 97.1 19 98 14Z"
                fill="currentColor"
                stroke="none"
            />
            {/* ground */}
            <path d="M28 84H92" strokeDasharray="2 6" />
        </svg>
    );
}

export function EmptyReviewsIllustration({ className }: IllustrationProps) {
    return (
        <svg
            viewBox="0 0 120 96"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={className}
        >
            {/* speech bubble with tail */}
            <path d="M38 20H82C87.5 20 92 24.5 92 30V54C92 59.5 87.5 64 82 64H60L46 76V64H38C32.5 64 28 59.5 28 54V30C28 24.5 32.5 20 38 20Z" />
            {/* asterisk inside */}
            <path d="M60 33V51" />
            <path d="M52 37.5L68 46.5" />
            <path d="M68 37.5L52 46.5" />
            {/* ground */}
            <path d="M32 84H88" strokeDasharray="2 6" />
        </svg>
    );
}

export function EmptyListIllustration({ className }: IllustrationProps) {
    return (
        <svg
            viewBox="0 0 120 96"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={className}
        >
            {/* stacked rows */}
            <rect x="24" y="24" width="72" height="14" rx="3" />
            <circle cx="32" cy="31" r="2.5" fill="currentColor" stroke="none" />
            <path d="M40 31H88" />
            <rect x="24" y="46" width="72" height="14" rx="3" />
            <circle cx="32" cy="53" r="2.5" fill="currentColor" stroke="none" />
            <path d="M40 53H88" />
            <rect x="24" y="68" width="72" height="14" rx="3" />
            <circle cx="32" cy="75" r="2.5" fill="currentColor" stroke="none" />
            <path d="M40 75H88" />
            {/* sparkle accent */}
            <path
                d="M104 10C104.8 14.4 107.1 16.7 111.5 17.5C107.1 18.3 104.8 20.6 104 25C103.2 20.6 100.9 18.3 96.5 17.5C100.9 16.7 103.2 14.4 104 10Z"
                fill="currentColor"
                stroke="none"
            />
        </svg>
    );
}
