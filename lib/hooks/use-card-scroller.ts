"use client";

import { useRef, useState } from "react";

// Shared logic for the horizontal card scrollers (Discussions, Movies and TV
// Series): paged scrolling via the header chevron buttons and scroll-edge
// state for the fixed blur overlays. Free scrolling (wheel/touch) is
// untouched — no CSS snapping.
export function useCardScroller() {
    const scrollerRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

    const updateScrollState = () => {
        const el = scrollerRef.current;
        if (!el) return;
        setCanScrollLeft(el.scrollLeft > 0);
        setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
    };

    // Page one full set of cards at a time, landing so the window of fully
    // visible cards is centered with a cut-off card peeking on each side
    // (except at the very start/end, where the browser clamps the scroll)
    const scrollByPage = (direction: -1 | 1) => {
        const el = scrollerRef.current;
        if (!el) return;
        const cards = Array.from(el.children) as HTMLElement[];
        if (cards.length < 2) return;
        const step = cards[1].offsetLeft - cards[0].offsetLeft; // card width + gap
        const gap = step - cards[0].offsetWidth;
        const perPage = Math.max(1, Math.floor((el.clientWidth + gap) / step));
        const peek = (el.clientWidth - perPage * step + gap) / 2;
        const firstVisible = Math.round((el.scrollLeft + peek) / step);
        const targetFirst = firstVisible + direction * perPage;
        el.scrollTo({
            left: targetFirst <= 0 ? 0 : targetFirst * step - peek,
            behavior: "smooth",
        });
    };

    return {
        scrollerRef,
        canScrollLeft,
        canScrollRight,
        updateScrollState,
        scrollByPage,
    };
}
