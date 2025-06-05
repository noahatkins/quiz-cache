import {DeckView} from "@/app/components/DeckView";

export default async function DeckPage({params}: {params: Promise<{id: string}>}) {
  const {id} = await params;

  return <DeckView deckId={id} />;
}
