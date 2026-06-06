"use client";
import { IconArrowNarrowRight } from "@tabler/icons-react";
import { useState, useRef, useId, useEffect } from "react";

interface SlideData {
  title: string;
  button: string;
  src: string;
}

interface SlideProps {
  slide: SlideData;
  index: number;
  current: number;
  handleSlideClick: (index: number) => void;
}

const Slide = ({ slide, index, current, handleSlideClick }: SlideProps) => {
  const slideRef = useRef<HTMLLIElement>(null);

  const imageLoaded = (event: React.SyntheticEvent<HTMLImageElement>) => {
    (event.target as HTMLImageElement).style.opacity = "1";
  };

  const { src, button, title } = slide;
  const isActive = current === index;

  return (
    <div className="shrink-0">
      <li
        ref={slideRef}
        className="flex flex-col items-center justify-end relative text-center text-white cursor-pointer transition-all duration-500 ease-in-out w-[240px] h-[320px] sm:w-[320px] sm:h-[400px] mx-2 sm:mx-3 z-10 rounded-2xl overflow-hidden touch-manipulation"
        onClick={() => handleSlideClick(index)}
        style={{
          transform: isActive
            ? "scale(1)"
            : "scale(0.88)",
          opacity: isActive ? 1 : 0.5,
          transition: "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s ease",
          transformOrigin: "bottom",
        }}
      >
        <div className="absolute inset-0 bg-[#1D1F2F] rounded-2xl overflow-hidden">
          <img
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
            style={{ opacity: isActive ? 1 : 0.6 }}
            alt={title}
            src={src}
            onLoad={imageLoaded}
            loading="eager"
            decoding="sync"
          />
          {isActive && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          )}
        </div>

        {/* Info overlay — only visible on active slide */}
        <article
          className={`relative z-10 w-full p-4 sm:p-5 text-left transition-all duration-500 ${
            isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
          }`}
        >
          <h2 className="text-lg sm:text-2xl font-bold leading-tight drop-shadow-lg">
            {title}
          </h2>
          <div className="mt-2">
            <span className="inline-block px-3 py-1 text-[10px] sm:text-xs font-semibold rounded-full bg-white/20 text-white/90">
              {button}
            </span>
          </div>
        </article>
      </li>
    </div>
  );
};

interface CarouselControlProps {
  type: string;
  title: string;
  handleClick: () => void;
}

const CarouselControl = ({ type, title, handleClick }: CarouselControlProps) => (
  <button
    className={`w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center bg-white/10 border border-white/20 rounded-full active:bg-white/20 active:scale-95 sm:hover:bg-white/20 transition duration-200 touch-manipulation ${
      type === "previous" ? "rotate-180" : ""
    }`}
    title={title}
    onClick={handleClick}
  >
    <IconArrowNarrowRight className="text-white w-5 h-5" />
  </button>
);

interface CarouselProps {
  slides: SlideData[];
  initialIndex?: number;
  onSlideChange?: (index: number) => void;
}

export default function Carousel({ slides, initialIndex = 1, onSlideChange }: CarouselProps) {
  const [current, setCurrent] = useState(
    Math.min(initialIndex, slides.length - 1)
  );
  const [slideWidth, setSlideWidth] = useState(344);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateWidth = () => {
      // Mobile: 240px slide + 16px margin = 256px
      // Desktop: 320px slide + 24px margin = 344px
      setSlideWidth(window.innerWidth < 640 ? 256 : 344);
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  const handleChange = (next: number) => {
    setCurrent(next);
    onSlideChange?.(next);
  };

  const handlePreviousClick = () => {
    const prev = current - 1;
    handleChange(prev < 0 ? slides.length - 1 : prev);
  };

  const handleNextClick = () => {
    const next = current + 1;
    handleChange(next === slides.length ? 0 : next);
  };

  const handleSlideClick = (index: number) => {
    if (current !== index) handleChange(index);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); handlePreviousClick(); }
    if (e.key === "ArrowRight") { e.preventDefault(); handleNextClick(); }
  };

  // Touch/swipe support
  const touchStartX = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) handleNextClick();
      else handlePreviousClick();
    }
  };

  const id = useId();
  const offset = current * slideWidth;

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden outline-none"
      aria-labelledby={`carousel-heading-${id}`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slides track — centered, clipped horizontally */}
      <div className="flex justify-center">
        <div className="relative" style={{ width: `${slideWidth}px` }}>
          <ul
            className="flex transition-transform duration-500 ease-in-out"
            style={{
              transform: `translateX(-${offset}px)`,
            }}
          >
            {slides.map((slide, index) => (
              <Slide
                key={index}
                slide={slide}
                index={index}
                current={current}
                handleSlideClick={handleSlideClick}
              />
            ))}
          </ul>
        </div>
      </div>

      {/* Navigation arrows */}
      <div className="flex justify-center gap-3 sm:gap-4 mt-4 sm:mt-6">
        <CarouselControl
          type="previous"
          title="Go to previous slide"
          handleClick={handlePreviousClick}
        />
        <CarouselControl
          type="next"
          title="Go to next slide"
          handleClick={handleNextClick}
        />
      </div>
    </div>
  );
}
