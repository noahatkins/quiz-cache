"use client";
import {useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import {motion} from "framer-motion";
import {ArrowLeft, ArrowLeftCircle, ArrowRightCircle, Undo2} from "lucide-react";

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  deckId: string;
}

interface FlashcardDeck {
  id: string;
  name: string;
  flashcards: Flashcard[];
}

export function DeckView({deckId}: {deckId: string}) {
  const router = useRouter();
  const [deck, setDeck] = useState<FlashcardDeck | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    const savedDecks = JSON.parse(localStorage.getItem("flashcardDecks") || "[]");
    const foundDeck = savedDecks.find((d: FlashcardDeck) => d.id === deckId);
    if (foundDeck) {
      setDeck(foundDeck);
    } else {
      router.push("/");
    }
  }, [deckId, router]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!deck) return;

      // Prevent default behavior for arrow keys and space
      if (["ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }

      switch (e.key) {
        case "ArrowLeft":
          setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
          setIsFlipped(false);
          break;
        case "ArrowRight":
          setCurrentIndex((prev) => (prev < deck.flashcards.length - 1 ? prev + 1 : prev));
          setIsFlipped(false);
          break;
        case " ":
          setIsFlipped((prev) => !prev);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deck]);

  if (!deck) return null;

  const currentCard = deck.flashcards[currentIndex];
  const progress = ((currentIndex + 1) / deck.flashcards.length) * 100;

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < deck.flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  return (
    <div className="min-h-screen w-full bg-[var(--background-light)] p-8 flex flex-col">
      {/* Header */}
      <div className="max-w-3xl mx-auto w-full mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.button whileHover={{scale: 1.05}} whileTap={{scale: 0.95}} onClick={() => router.push("/")} className="p-2 rounded-lg hover:bg-[var(--background)] transition-colors">
            <ArrowLeft className="text-[var(--text)]" size={20} />
          </motion.button>
          <h1 className="text-2xl font-bold text-[var(--text)]">{deck.name}</h1>
        </div>
        <div className="text-sm text-[var(--text-secondary)]">
          Card {currentIndex + 1} of {deck.flashcards.length}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center mb-8">
        <div className="w-[480px]">
          <motion.div className="relative aspect-[3/2] bg-[var(--background)] rounded-xl shadow-lg overflow-hidden cursor-pointer" whileHover={{scale: 1.02}} whileTap={{scale: 0.98}} onClick={() => setIsFlipped(!isFlipped)}>
            <div className={`absolute inset-0 transition-transform duration-500 transform ${isFlipped ? "rotate-y-180" : ""}`} style={{backfaceVisibility: "hidden"}}>
              <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                <h2 className="text-xl font-semibold text-[var(--text)] mb-4">Question</h2>
                <p className="text-lg text-[var(--text)]">{currentCard.question}</p>
              </div>
            </div>
            <div className={`absolute inset-0 transition-transform duration-500 transform ${isFlipped ? "" : "rotate-y-180"}`} style={{backfaceVisibility: "hidden"}}>
              <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                <h2 className="text-xl font-semibold text-[var(--text)] mb-4">Answer</h2>
                <p className="text-lg text-[var(--text)]">{currentCard.answer}</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Controls */}
      <div className="max-w-3xl mx-auto w-full">
        {/* Progress Bar */}
        <div className="h-1 w-full bg-[var(--border)] rounded-full mb-6">
          <div className="h-full bg-[var(--primary)] rounded-full transition-all duration-300" style={{width: `${progress}%`}} />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="text-sm text-[var(--text-secondary)]">
            <p>Space or click to flip</p>
            <p>← → arrows to navigate</p>
          </div>
          <div className="flex items-center gap-3">
            <motion.button whileHover={{scale: 1.1}} whileTap={{scale: 0.9}} onClick={handleRestart} className="p-2 text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors" disabled={currentIndex === 0}>
              <Undo2 size={24} />
            </motion.button>
            <motion.button whileHover={{scale: 1.1}} whileTap={{scale: 0.9}} onClick={handlePrevious} className="p-2 text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors" disabled={currentIndex === 0}>
              <ArrowLeftCircle size={24} />
            </motion.button>
            <motion.button whileHover={{scale: 1.1}} whileTap={{scale: 0.9}} onClick={handleNext} className="p-2 text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors" disabled={currentIndex === deck.flashcards.length - 1}>
              <ArrowRightCircle size={24} />
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
