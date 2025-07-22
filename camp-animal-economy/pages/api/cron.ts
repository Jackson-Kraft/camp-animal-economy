import { createClient } from '@supabase/supabase-js';
export default async function handler(req, res) {
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
  await sb.from('market').update({ demand: sb.raw('demand + 1') }).neq('type', '');
  res.status(200).send('Demand incremented.');
}
