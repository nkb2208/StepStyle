import { MongoClient, type Collection, type Db, type ObjectId } from "mongodb";

export interface OrderDoc {
  _id?: ObjectId;
  id: string;
  ownerId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  status: "pending" | "paid" | "shipped" | "cancelled";
  createdAt: Date;
  updatedAt: Date;
}

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectOrderDb(uri: string = process.env.ORDER_MONGODB_URI ?? "mongodb://localhost:27017/order-db"): Promise<Db> {
  if (db) return db;
  client = new MongoClient(uri);
  await client.connect();
  db = client.db(new URL(uri).pathname.replace(/^\//, "") || "order-db");
  await db.collection("orders").createIndex({ id: 1 }, { unique: true });
  await db.collection("orders").createIndex({ ownerId: 1 });
  return db;
}

export function getOrders(): Collection<OrderDoc> {
  if (!db) throw new Error("Order database not initialized. Call connectOrderDb() first.");
  return db.collection<OrderDoc>("orders");
}

export async function disconnectOrderDb(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

export type PublicOrder = Omit<OrderDoc, "_id">;

export function toPublicOrder(doc: OrderDoc): PublicOrder {
  const { _id: _ignored, ...rest } = doc;
  return rest;
}
