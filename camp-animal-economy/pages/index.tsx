import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";

const TYPES = [
  "Mammal",
  "Bird",
  "Amphibian",
  "Reptile",
  "Insect",
  "Arachnid",
  "Fish",
  "Plant",
  "Bundle of Stilt Grass"
];

const BASE_PRICE = 0.5;
const DEMAND_MULTIPLIER = 0.1;
const SUPPLY_PENALTY = 0.05;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function CampEconomy() {
  const [market, setMarket] = useState([]);
  const [collected, setCollected] = useState([]);

  useEffect(() => {
    // Initial fetch of market data
    async function fetchMarket() {
      const { data, error } = await supabase.from("market").select("*");
      if (error) {
        console.error("Error fetching market:", error);
      } else {
        setMarket(data);
      }
    }
    fetchMarket();

    // Subscribe to real-time updates
    const subscription = supabase
      .from("market")
      .on("UPDATE", (payload) => {
        setMarket((prev) =>
          prev.map((item) =>
            item.type === payload.new.type ? payload.new : item
          )
        );
      })
      .subscribe();

    return () => {
      supabase.removeSubscription(subscription);
    };
  }, []);

  const getPrice = (a) => {
    const rawPrice = BASE_PRICE + (a.demand * DEMAND_MULTIPLIER - a.supply * SUPPLY_PENALTY);
    return Math.max(0, rawPrice).toFixed(2);
  };

  const handleCollect = async (type) => {
    // Find item in market
    const item = market.find((m) => m.type === type);
    if (!item) return;

    // Update supply & demand in DB
    const updatedSupply = item.supply + 1;
    const updatedDemand = Math.max(0, item.demand - 1);

    const { error } = await supabase
      .from("market")
      .update({ supply: updatedSupply, demand: updatedDemand })
      .eq("type", type);

    if (error) {
      console.error("Update failed:", error);
      return;
    }

    // Add collected item locally for feedback
    setCollected((prev) => [
      ...prev,
      { type, value: getPrice({ ...item, supply: updatedSupply, demand: updatedDemand }) },
    ]);
  };

  return (
    <main className="pt-12 px-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {market.map((animal, i) => (
        <Card key={i} className="rounded-2xl shadow-md">
          <CardContent className="p-4">
            <h2 className="text-xl font-bold">{animal.type}</h2>
            <p>Supply: {animal.supply}</p>
            <p>Demand: {animal.demand}</p>
            <p className="font-bold">Current Price: ${getPrice(animal)}</p>
            <Button className="mt-2" onClick={() => handleCollect(animal.type)}>
              Collect One
            </Button>
            <div className="mt-4 h-32">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={animal.history || []}>
                  <XAxis dataKey="time" hide />
                  <YAxis domain={["auto", "auto"]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="price" stroke="#2563eb" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="col-span-full mt-8">
        <h2 className="text-2xl font-bold mb-2">Collected Items</h2>
        <ul className="space-y-2">
          {collected.map((item, idx) => (
            <li key={idx} className="bg-white p-2 rounded shadow">
              You collected a {item.type} worth ${item.value}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
