import { QdrantClient } from "@qdrant/js-client-rest";

const qdrantUrl = process.env.QDRANT_URL || "http://127.0.0.1:6333";
export const vectorCollectionName = process.env.QDRANT_COLLECTION || "pocketpilot_vectors";

export const qdrant = new QdrantClient({
  url: qdrantUrl,
});

export async function ensureVectorCollection(dimension: number): Promise<void> {
  const collections = await qdrant.getCollections();
  const exists = collections.collections.some(
    (collection) => collection.name === vectorCollectionName,
  );

  if (exists) {
    return;
  }

  await qdrant.createCollection(vectorCollectionName, {
    vectors: {
      size: dimension,
      distance: "Cosine",
    },
  });
}
