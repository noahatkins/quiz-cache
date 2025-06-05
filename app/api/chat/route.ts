import {openai} from "@ai-sdk/openai";
import {generateText, tool} from "ai";
import {z} from "zod";
import {NextRequest, NextResponse} from "next/server";

// Don't set worker source here - we'll do it dynamically when needed

export const maxDuration = 30;

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  deckId: string;
}

const flashcardContext = `You are an AI assistant that creates flashcards from text content. 
Your task is to create EXACTLY the number of flashcards requested - no more, no less.
Create flashcards with clear questions and concise answers.
Each flashcard should have a question and answer field.
Create questions and answers that are easy to understand and answer and relevant to the content.
Add uniqueness while keeping it simple. From my testing, you generate the same flashcards most of the time so try to be creative and unique but also make sure it is niche to the content.
If asked for N flashcards, you MUST create exactly N flashcards.
If you cannot create enough unique flashcards from the content, still create N flashcards by approaching the content from different angles.`;

async function extractTextFromFile(file: File): Promise<string> {
  try {
    if (file.name.toLowerCase().endsWith(".txt")) {
      const buffer = await file.arrayBuffer();
      try {
        const text = new TextDecoder().decode(buffer);
        if (!text || text.trim().length === 0) {
          throw new Error("The text file appears to be empty.");
        }
        return text.trim();
      } catch (error) {
        console.error("Text file parsing error:", error);
        throw new Error("Failed to read the text file. Please make sure it's a valid UTF-8 encoded text file.");
      }
    } else if (file.name.toLowerCase().endsWith(".pdf")) {
      console.log("PDF file detected:", {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      });

      try {
        const buffer = await file.arrayBuffer();
        console.log("Buffer created:", {
          bufferSize: buffer.byteLength,
        });

        // Import the ESM version of pdf-parse
        const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;

        // Convert ArrayBuffer to Buffer
        const uint8Array = new Uint8Array(buffer);
        const nodeBuffer = Buffer.from(uint8Array);

        const data = await pdfParse(nodeBuffer, {
          max: 0, // No page limit
          version: "v2.0.550",
        });

        console.log("PDF parsed successfully:", {
          pageCount: data.numpages,
          textLength: data.text?.length || 0,
          version: data.version,
          info: data.info,
        });

        if (!data.text || data.text.trim().length === 0) {
          throw new Error("Could not extract text from PDF. The file might be empty, scanned, or contain only images.");
        }

        // Clean up the extracted text
        const cleanText = data.text
          .trim()
          .replace(/\r\n/g, "\n") // Normalize line endings
          .replace(/\n{3,}/g, "\n\n") // Remove excessive newlines
          .replace(/\s+/g, " ") // Normalize spaces
          .trim();

        if (cleanText.length === 0) {
          throw new Error("The PDF appears to be empty after cleaning the text.");
        }

        return cleanText;
      } catch (error: unknown) {
        const err = error as Error;
        console.error("PDF parsing error:", {
          message: err.message,
          stack: err.stack,
        });
        throw new Error("Failed to extract text from the PDF. Please ensure it contains searchable text.");
      }
    } else {
      throw new Error("Unsupported file type. Please upload a .txt or .pdf file.");
    }
  } catch (error) {
    console.error("File processing error:", error);
    throw error instanceof Error ? error : new Error("An unknown error occurred while processing the file.");
  }
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File;
  const count = parseInt(formData.get("count") as string);
  const deckId = formData.get("deckId") as string;
  const apiKey = req.headers.get("X-OpenAI-Key");

  if (!file || !count || !deckId) {
    return new Response(JSON.stringify({error: "Missing required fields"}), {
      status: 400,
      headers: {"Content-Type": "application/json"},
    });
  }

  if (!apiKey) {
    return new Response(JSON.stringify({error: "OpenAI API key is required"}), {
      status: 401,
      headers: {"Content-Type": "application/json"},
    });
  }

  try {
    const text = await extractTextFromFile(file);
    process.env.OPENAI_API_KEY = apiKey;

    try {
      const messages = [
        {
          role: "system" as const,
          content: flashcardContext,
        },
        {
          role: "user" as const,
          content: `Create EXACTLY ${count} flashcards from this content. No more, no less than ${count} flashcards:\n\n${text}`,
        },
      ];

      const result = await generateText({
        model: openai("gpt-3.5-turbo"), // Using 3.5 since we're now passing plain text
        messages,
        tools: {
          createFlashcards: tool({
            description: "Create flashcards from the provided text",
            parameters: z.object({
              flashcards: z
                .array(
                  z.object({
                    id: z.string().min(1),
                    question: z.string().min(1),
                    answer: z.string().min(1),
                  })
                )
                .refine((arr) => arr.length === count, {
                  message: `Must create exactly ${count} flashcards`,
                }),
            }),
            execute: async ({flashcards}) => {
              if (flashcards.length !== count) {
                throw new Error(`Expected exactly ${count} flashcards, but got ${flashcards.length}`);
              }

              const validatedFlashcards = flashcards.map((card) => ({
                ...card,
                deckId,
              }));

              return {
                success: true,
                flashcards: validatedFlashcards,
              };
            },
          }),
        },
      });

      return NextResponse.json({flashcards: result.toolResults[0].result.flashcards}, {status: 200});
    } catch (openaiError: any) {
      console.error("OpenAI API Error:", openaiError);
      if (openaiError.status === 401 || openaiError.message?.includes("API key")) {
        return NextResponse.json({error: "Invalid OpenAI API key"}, {status: 401});
      }
      if (openaiError.status === 429) {
        return NextResponse.json({error: "OpenAI API rate limit exceeded"}, {status: 429});
      }
      return NextResponse.json(
        {
          error: "Error communicating with OpenAI API",
          details: openaiError.message || "Unknown error",
        },
        {status: 500}
      );
    }
  } catch (error: unknown) {
    console.error("Error processing file:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "An unknown error occurred",
      },
      {status: 500}
    );
  }
}
