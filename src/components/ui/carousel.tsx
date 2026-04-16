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
  const xRef = useRef(0);
  const yRef = useRef(0);
  const frameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const animate = () => {
      if (!slideRef.current) return;
      slideRef.current.style.setProperty("--x", `${xRef.current}px`);
      slideRef.current.style.setProperty("--y", `${yRef.current}px`);
      frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  const handleMouseMove = (event: React.MouseEvent) => {
    const el = slideRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    xRef.current = event.clientX - (r.left + Math.floor(r.width / 2));
    yRef.current = event.clientY - (r.top + Math.floor(r.height / 2));
  };

  const handleMouseLeave = () => {
    xRef.current = 0;
    yRef.current = 0;
  };

  const imageLoaded = (event: React.SyntheticEvent<HTMLImageElement>) => {
    (event.target as HTMLImageElement).style.opacity = "1";
  };

  const { src, button, title } = slide;
  const isActive = current === index;

  return (
    <div className="[perspective:1200px] [transform-style:preserve-3d] shrink-0">
      <li
        ref={slideRef}
        className="flex flex-col items-center justify-end relative text-center text-white cursor-pointer transition-all duration-500 ease-in-out w-[280px] h-[360px] sm:w-[320px] sm:h-[400px] mx-3 z-10 rounded-2xl overflow-hidden"
        onClick={() => handleSlideClick(index)}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: isActive
            ? "scale(1) rotateX(0deg)"
            : "scale(0.88) rotateX(6deg)",
          opacity: isActive ? 1 : 0.5,
          transition: "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s ease",
          transformOrigin: "bottom",
        }}
      >
        <div
          className="absolute inset-0 bg-[#1D1F2F] rounded-2xl overflow-hidden transition-all duration-150 ease-out"
          style={{
            transform: isActive
              ? "translate3d(calc(var(--x) / 40), calc(var(--y) / 40), 0)"
              : "none",
          }}
        >
          <img
            className="absolute inset-0 w-[115%] h-[115%] object-cover transition-opacity duration-500"
            style={{ opacity: isActive ? 1 : 0.6 }}
            alt={title}
            src={src}
            onLoad={imageLoaded}
            loading="eager"
            decoding="sync"
          />
          {isActive && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-all duration-700" />
          )}
        </div>

        {/* Info overlay — only visible on active slide */}
        <article
          className={`relative z-10 w-full p-5 text-left transition-all duration-500 ${
            isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
          }`}
        >
          <h2 className="text-xl sm:text-2xl font-bold leading-tight drop-shadow-lg">
            {title}
          </h2>
          <div className="mt-2">
            <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-white/20 backdrop-blur-sm text-white/90">
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
    className={`w-11 h-11 flex items-center justify-center bg-white/10 backdrop-blur-md border border-white/20 rounded-full hover:bg-white/20 hover:-translate-y-0.5 active:translate-y-0.5 transition duration-200 ${
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

  const id = useId();

  // Calculate translateX to center the current slide
  // Each slide is ~320px + 24px margin = 344px. We want current slide centered.
  const slideWidth = 344; // sm width + gap
  const offset = current * slideWidth;

  return (
    <div
      className="relative w-full"
      aria-labelledby={`carousel-heading-${id}`}
    >
      {/* Slides track — centered with overflow visible */}
      <div className="overflow-visible flex justify-center">
        <div className="relative" style={{ width: `${slideWidth}px` }}>
          <ul
            className="flex transition-transform duration-700 ease-in-out"
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

      {/* Navigation arrows — below the carousel, always visible */}
      <div className="flex justify-center gap-4 mt-6">
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
