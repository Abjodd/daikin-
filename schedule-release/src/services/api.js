import { ROWS } from '../data/mockData.js'

// Swap this for a real fetch() call when the backend is ready, e.g.
//   const res = await fetch(`${import.meta.env.VITE_API_URL}/records`)
//   return res.json()
export async function getRecords() {
  return Promise.resolve(ROWS)
}
