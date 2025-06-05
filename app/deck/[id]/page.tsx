import {DeckView} from "@/app/components/DeckView";

export default function DeckPage({params}: {params: {id: string}}) {
  return <DeckView deckId={params.id} />;
}
