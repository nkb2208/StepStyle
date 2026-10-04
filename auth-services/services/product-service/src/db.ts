import { MongoClient, type Collection, type Db, type ObjectId } from "mongodb";

export interface ProductDoc {
  _id?: ObjectId;
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectProductDb(uri: string = process.env.PRODUCT_MONGODB_URI ?? "mongodb://localhost:27017/product-db"): Promise<Db> {
  if (db) return db;
  client = new MongoClient(uri);
  await client.connect();
  db = client.db(new URL(uri).pathname.replace(/^\//, "") || "product-db");
  await db.collection("products").createIndex({ id: 1 }, { unique: true });
  await db.collection("products").createIndex({ ownerId: 1 });
  return db;
}

export function getProducts(): Collection<ProductDoc> {
  if (!db) throw new Error("Product database not initialized. Call connectProductDb() first.");
  return db.collection<ProductDoc>("products");
}

export async function disconnectProductDb(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

export interface PublicProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export function toPublicProduct(doc: ProductDoc): PublicProduct {
  return {
    id: doc.id,
    name: doc.name,
    description: doc.description,
    price: doc.price,
    stock: doc.stock,
    ownerId: doc.ownerId,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
