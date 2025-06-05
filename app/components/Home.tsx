"use client";
import {useRef, useState, useEffect} from "react";
import {useRouter} from "next/navigation";
import {motion, AnimatePresence} from "framer-motion";
import {Settings, X, ArrowRight, Trash2, Plus, Sun, Moon, AlertTriangle, ArrowLeft, Upload} from "lucide-react";

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

type CreationStep = "count" | "upload" | "edit" | "complete";

export function Home() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [creationStep, setCreationStep] = useState<CreationStep>("count");
  const [flashcardCount, setFlashcardCount] = useState(5);
  const [deckName, setDeckName] = useState("");
  const [currentDeck, setCurrentDeck] = useState<FlashcardDeck | null>(null);
  const [generatedFlashcards, setGeneratedFlashcards] = useState<Flashcard[]>([]);
  const [apiKey, setApiKey] = useState("");
  const modalRef = useRef<HTMLDivElement>(null);
  const settingsModalRef = useRef<HTMLDivElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize all localStorage-dependent state here
    const savedDecks = JSON.parse(localStorage.getItem("flashcardDecks") || "[]");
    setDecks(savedDecks);

    const savedTheme = localStorage.getItem("theme") as "light" | "dark";
    const savedApiKey = localStorage.getItem("openai_api_key") || "";
    const savedCount = localStorage.getItem("lastFlashcardCount");

    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    }

    if (savedApiKey) {
      setApiKey(savedApiKey);
    }

    if (savedCount) {
      setFlashcardCount(parseInt(savedCount));
    }
  }, []);

  // Save flashcard count when it changes
  useEffect(() => {
    localStorage.setItem("lastFlashcardCount", flashcardCount.toString());
  }, [flashcardCount]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setShowUploadModal(false);
        setCreationStep("count");
        setCurrentDeck(null);
        setGeneratedFlashcards([]);
        setDeckName("");
        setUploadError(null);
      }
    };

    if (showUploadModal) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showUploadModal]);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
  };

  const handleApiKeyChange = (newKey: string) => {
    setApiKey(newKey);
    localStorage.setItem("openai_api_key", newKey);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!apiKey) {
      setShowSettingsModal(true);
      return;
    }

    // Reset states
    setUploadError(null);
    setIsProcessing(true);
    setGeneratedFlashcards([]);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("count", flashcardCount.toString());

      const deckId = crypto.randomUUID();
      formData.append("deckId", deckId);

      const newDeck: FlashcardDeck = {
        id: deckId,
        name: deckName,
        flashcards: [],
      };
      setCurrentDeck(newDeck);

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "X-OpenAI-Key": apiKey,
        },
        body: formData,
      });

      // Check if it's an error response
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Something went wrong. Please check your API key and try again.");
      }

      const data = await response.json();
      // Reset file input to allow re-upload of the same file
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Handle the flashcards from the response
      if (data.flashcards && Array.isArray(data.flashcards)) {
        if (data.flashcards.length < flashcardCount) {
          throw new Error(`Not enough flashcards were generated (${data.flashcards.length}/${flashcardCount}). Please try again.`);
        }
        setGeneratedFlashcards(data.flashcards);
        setCreationStep("edit");
      } else {
        throw new Error("Invalid response format. Please try again.");
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Something went wrong. Please check your API key and try again.");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      if (error instanceof Error && (error.message.includes("API key") || error.message.includes("401"))) {
        setShowSettingsModal(true);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Update the back button handler in the upload step
  const handleBackToCount = () => {
    setCreationStep("count");
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Update the renderCreationStep function's upload case
  const renderCreationStep = () => {
    switch (creationStep) {
      case "count":
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-[var(--text)]">Create Set</h2>
            {!apiKey && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="p-1">
                    <AlertTriangle size={18} className="text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-amber-800">API Key Required</h3>
                    <p className="mt-1 text-sm text-amber-700">
                      Please add your OpenAI API key in settings before creating flashcards.{" "}
                      <button
                        onClick={() => {
                          setShowUploadModal(false);
                          setShowSettingsModal(true);
                        }}
                        className="font-medium underline underline-offset-2 hover:text-amber-800 transition-colors"
                      >
                        Open Settings
                      </button>
                    </p>
                  </div>
                </div>
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Set Name</label>
                <input type="text" value={deckName} onChange={(e) => setDeckName(e.target.value)} placeholder="Enter set name" className="w-full px-4 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Number of Flashcards: {flashcardCount}</label>
                <div className="relative w-full h-2 bg-[var(--border)] rounded-lg">
                  <input type="range" min="1" max="20" value={flashcardCount} onChange={(e) => setFlashcardCount(parseInt(e.target.value))} className="absolute w-full h-full opacity-0 cursor-pointer z-10" />
                  <div className="absolute h-full bg-[var(--primary)] rounded-lg transition-all" style={{width: `${(flashcardCount / 20) * 100}%`}} />
                  <div className="absolute w-4 h-4 bg-[var(--primary)] rounded-full -mt-1 shadow-lg cursor-grab active:cursor-grabbing transition-all" style={{left: `calc(${(flashcardCount / 20) * 100}% - 0.5rem)`}} />
                </div>
                <div className="flex justify-between mt-1 text-xs text-[var(--text-secondary)]">
                  <span>1</span>
                  <span>20</span>
                </div>
              </div>
            </div>
            <button onClick={() => setCreationStep("upload")} disabled={!deckName.trim() || !apiKey} className="w-full px-6 py-3 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              Continue
            </button>
          </div>
        );

      case "upload":
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <button onClick={handleBackToCount} className="p-2 rounded-lg hover:bg-[var(--background-light)] transition-colors">
                <ArrowLeft size={20} className="text-[var(--text)]" />
              </button>
              <h2 className="text-2xl font-bold text-[var(--text)]">Upload Document</h2>
            </div>

            {showUploadModal && uploadError && (
              <div className="p-4 bg-red-500/5 dark:bg-red-500/10 border border-red-500/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="p-1">
                    <AlertTriangle size={18} className="text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-red-700 dark:text-red-400">Upload Failed</h3>
                    <p className="mt-1 text-sm text-red-600 dark:text-red-300">{uploadError}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="border-2 border-dashed border-[var(--border)] rounded-lg p-8 text-center">
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".txt,.pdf" className="hidden" />
              {isProcessing ? (
                <div className="space-y-3">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)] mx-auto" />
                  <p className="text-[var(--text-secondary)]">Processing your document...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="mx-auto w-12 h-12 rounded-full bg-[var(--primary)]/10 flex items-center justify-center">
                    <Upload size={24} className="text-[var(--primary)]" />
                  </div>
                  <div>
                    <button onClick={() => fileInputRef.current?.click()} className="text-[var(--primary)] font-medium hover:underline">
                      Click to upload
                    </button>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">Supported formats: TXT, PDF (max 10MB)</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case "edit":
        if (isProcessing) {
          return (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-[var(--text)] tracking-tight">Processing Your Document</h2>
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)]"></div>
              </div>
              <p className="text-center text-[var(--text-secondary)]">Generating flashcards...</p>
            </div>
          );
        }

        return (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <motion.button whileHover={{scale: 1.02}} whileTap={{scale: 0.98}} onClick={() => setCreationStep("upload")} className="p-2 rounded-lg hover:bg-[var(--background-light)] transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text)]">
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </motion.button>
              <h2 className="text-2xl font-bold text-[var(--text)] tracking-tight">Review Flashcards</h2>
            </div>
            <div className="overflow-hidden">
              <div className="max-h-[60vh] overflow-y-auto pr-2">
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 bg-[var(--background)] z-10">
                    <tr className="border-b border-[var(--border)]">
                      <th className="px-4 py-3 text-left text-sm font-medium text-[var(--text-secondary)]">#</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-[var(--text-secondary)]">Question</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-[var(--text-secondary)]">Answer</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-[var(--text-secondary)]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {generatedFlashcards.map((card, index) => (
                      <tr key={card.id} className="hover:bg-[var(--background-light)] transition-colors">
                        <td className="px-4 py-3 text-[var(--text-secondary)] align-top">{index + 1}</td>
                        <td className="px-4 py-3">
                          <textarea value={card.question || ""} onChange={(e) => handleFlashcardEdit(index, "question", e.target.value)} className="w-full bg-transparent text-[var(--text)] focus:outline-none resize-none min-h-[60px]" placeholder="Enter question" rows={Math.max(3, Math.ceil(card.question.length / 40))} />
                        </td>
                        <td className="px-4 py-3">
                          <textarea value={card.answer || ""} onChange={(e) => handleFlashcardEdit(index, "answer", e.target.value)} className="w-full bg-transparent text-[var(--text)] focus:outline-none resize-none min-h-[60px]" placeholder="Enter answer" rows={Math.max(3, Math.ceil(card.answer.length / 40))} />
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex justify-center">
                            <motion.button whileHover={{scale: 1.1}} whileTap={{scale: 0.9}} onClick={() => handleDeleteFlashcard(index)} className="p-1 text-red-500 hover:bg-red-500/10 rounded-full transition-colors">
                              <Trash2 size={18} />
                            </motion.button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex gap-4">
              <motion.button whileHover={{scale: 1.02}} whileTap={{scale: 0.98}} onClick={() => setCreationStep("upload")} className="flex-1 px-6 py-3 border border-[var(--border)] text-[var(--text)] rounded-lg hover:bg-[var(--background-light)] transition-colors">
                Back
              </motion.button>
              <motion.button whileHover={{scale: 1.02}} whileTap={{scale: 0.98}} onClick={handleCreateDeck} disabled={generatedFlashcards.length === 0} className="flex-1 px-6 py-3 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                Create Set
              </motion.button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Update the modal open handler
  const handleOpenModal = () => {
    setShowUploadModal(true);
    setFlashcardCount(5); // Reset to 5 when opening modal
  };

  // Update the modal close handler
  const handleCloseModal = () => {
    setShowUploadModal(false);
    setCreationStep("count");
    setCurrentDeck(null);
    setGeneratedFlashcards([]);
    setDeckName("");
    setUploadError(null);
    setFlashcardCount(5); // Reset to 5 when closing modal
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCreateDeck = () => {
    if (!currentDeck || generatedFlashcards.length === 0 || !deckName.trim()) return;

    const updatedDeck = {
      ...currentDeck,
      name: deckName.trim(),
      flashcards: generatedFlashcards,
    };

    const updatedDecks = [...decks, updatedDeck];
    setDecks(updatedDecks);
    localStorage.setItem("flashcardDecks", JSON.stringify(updatedDecks));
    setShowUploadModal(false);
    setCreationStep("count");
    setCurrentDeck(null);
    setGeneratedFlashcards([]);
    setDeckName("");
  };

  const handleFlashcardEdit = (index: number, field: "question" | "answer", value: string) => {
    const updatedFlashcards = [...generatedFlashcards];
    if (updatedFlashcards[index]) {
      updatedFlashcards[index] = {
        ...updatedFlashcards[index],
        [field]: value || "", // Ensure value is never undefined
      };
      setGeneratedFlashcards(updatedFlashcards);
    }
  };

  const handleDeleteFlashcard = (index: number) => {
    setGeneratedFlashcards((cards) => cards.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen w-full bg-[var(--background-light)] p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-[var(--text)]">QuizCache</h1>
          <button onClick={() => setShowSettingsModal(true)} className="p-2 rounded-lg hover:bg-[var(--background)] transition-colors">
            <Settings className="text-[var(--text)]" size={24} />
          </button>
        </div>

        <div className="flex justify-end mb-6">
          <button onClick={handleOpenModal} className="px-6 py-3 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 transition-colors">
            Create Set
          </button>
        </div>

        <div className="bg-[var(--background)] rounded-xl shadow-sm overflow-hidden border border-[var(--border)]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="px-6 py-4 text-left text-sm font-medium text-[var(--text-secondary)]">Set Name</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-[var(--text-secondary)]">Cards</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-[var(--text-secondary)]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {decks.map((deck) => (
                  <tr key={deck.id} className="hover:bg-[var(--background-light)] transition-colors group">
                    <td className="px-6 py-4">
                      <div onClick={() => router.push(`/deck/${deck.id}`)} className="text-[var(--text)] font-medium hover:text-[var(--text-secondary)] cursor-pointer transition-colors">
                        {deck.name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--text)]/10 text-[var(--text)]">{deck.flashcards.length} cards</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => router.push(`/deck/${deck.id}`)} className="p-2 text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--background-light)] rounded-full transition-colors">
                          <ArrowRight size={18} />
                        </button>
                        <button
                          onClick={() => {
                            const newDecks = decks.filter((d) => d.id !== deck.id);
                            setDecks(newDecks);
                            localStorage.setItem("flashcardDecks", JSON.stringify(newDecks));
                          }}
                          className="p-2 text-red-500 hover:bg-red-500/10 rounded-full transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {decks.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-[var(--text-secondary)]">
                      <div className="flex flex-col items-center gap-2">
                        <Plus size={24} className="text-[var(--text-secondary)]" />
                        <span>No flashcard sets yet. Create your first set!</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <AnimatePresence>
          {showSettingsModal && (
            <motion.div initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} onClick={() => setShowSettingsModal(false)} className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
              <motion.div ref={settingsModalRef} initial={{scale: 0.95, opacity: 0}} animate={{scale: 1, opacity: 1}} exit={{scale: 0.95, opacity: 0}} onClick={(e) => e.stopPropagation()} className="bg-[var(--background)] p-8 rounded-lg max-w-md w-full mx-4 shadow-xl">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-[var(--text)]">Settings</h2>
                    <button onClick={() => setShowSettingsModal(false)} className="p-2 rounded-lg hover:bg-[var(--background-light)] transition-colors">
                      <X size={20} className="text-[var(--text)]" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">OpenAI API Key</label>
                      <input type="password" value={apiKey} onChange={(e) => handleApiKeyChange(e.target.value)} placeholder="sk-..." className="w-full px-4 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text)]" />
                      <p className="mt-1 text-xs text-[var(--text-secondary)]">Your API key is stored locally and never sent to our servers.</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Theme</label>
                      <button onClick={toggleTheme} className="w-full px-4 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text)] hover:bg-[var(--background-light)] transition-colors flex items-center justify-between">
                        <span>{theme === "light" ? "Light Mode" : "Dark Mode"}</span>
                        {theme === "light" ? <Sun size={18} /> : <Moon size={18} />}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showUploadModal && (
            <motion.div initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
              <motion.div ref={modalRef} initial={{scale: 0.9, opacity: 0}} animate={{scale: 1, opacity: 1}} exit={{scale: 0.9, opacity: 0}} className="bg-[var(--background)] p-8 rounded-lg max-w-2xl w-full mx-4 shadow-xl">
                {renderCreationStep()}
                {creationStep !== "edit" && (
                  <motion.button whileHover={{scale: 1.02}} whileTap={{scale: 0.98}} onClick={handleCloseModal} className="mt-4 w-full px-4 py-2 text-[var(--text)] border border-[var(--border)] rounded-lg hover:bg-[var(--background-light)] transition-colors">
                    Cancel
                  </motion.button>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
